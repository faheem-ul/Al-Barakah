import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  manualLoyaltyIneligibleReason,
  resolveManualLoyaltyContext,
} from "@/lib/loyalty/order-loyalty-context";
import { parseCustomerSpent } from "@/lib/loyalty/segments";
import { lookupOrderSheetContactByOrderNumbers } from "@/lib/google/sheets";
import { getShopifyCustomerIdsByEmails } from "@/lib/loyalty/shopify-customer-directory";
import { getLoyaltyVoucherSendsByOrderKeys } from "@/lib/loyalty/voucher-email-registry";
import { fetchPaidOrdersForManualLoyalty } from "@/lib/shopify/admin/loyalty-manual-send-orders";
import { resolveVoucherCodeUsage } from "@/lib/shopify/admin/loyalty-discount-usage";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function orderLabel(order: ShopifyWebhookOrder): string {
  const name = String(order.name || "").trim();
  if (name) return name.startsWith("#") ? name : `#${name}`;
  if (order.order_number) return `#${order.order_number}`;
  return `#${order.id}`;
}

function registryOrderKey(order: ShopifyWebhookOrder): string {
  const raw = order.order_number ?? order.name ?? order.id;
  return String(raw).trim().replace(/^#+/, "");
}

type OrdersFilter = "all" | "eligible" | "not_sent";

function parseFilter(value: string | null): OrdersFilter {
  return value === "eligible" || value === "not_sent" ? value : "all";
}

/** Shopify orders fetched per scan batch when filtering server-side. */
const SCAN_BATCH_SIZE = 100;
/** Safety cap on Shopify calls per request (SCAN_BATCH_SIZE × this orders scanned). */
const MAX_SCAN_BATCHES = 10;

type VoucherMap = Awaited<ReturnType<typeof getLoyaltyVoucherSendsByOrderKeys>>;

/**
 * Walk Shopify paid orders until `limit` rows match `filter`, so each page is
 * full of matching orders instead of filtering a fixed 50-order window.
 * `nextCursor` is the edge cursor of the last returned order.
 */
async function collectFilteredOrders(params: {
  limit: number;
  cursor: string | null;
  filter: OrdersFilter;
}): Promise<{
  orders: ShopifyWebhookOrder[];
  nextCursor: string | null;
  hasMore: boolean;
  voucherByKey?: VoucherMap;
}> {
  const { limit, filter } = params;

  if (filter === "all") {
    return fetchPaidOrdersForManualLoyalty({ limit, cursor: params.cursor });
  }

  const matched: ShopifyWebhookOrder[] = [];
  const voucherByKey: VoucherMap = new Map();
  let after = params.cursor;
  let hasMore = true;

  for (let batch = 0; batch < MAX_SCAN_BATCHES && hasMore; batch++) {
    const page = await fetchPaidOrdersForManualLoyalty({
      limit: SCAN_BATCH_SIZE,
      cursor: after,
    });

    const eligibleIdx = page.orders
      .map((order, i) => (resolveManualLoyaltyContext(order) ? i : -1))
      .filter((i) => i >= 0);

    const vouchers = await getLoyaltyVoucherSendsByOrderKeys(
      eligibleIdx.map((i) => registryOrderKey(page.orders[i])),
    );
    vouchers.forEach((v, k) => voucherByKey.set(k, v));

    for (const i of eligibleIdx) {
      const order = page.orders[i];
      if (
        filter === "not_sent" &&
        vouchers.get(registryOrderKey(order))?.status === "sent"
      ) {
        continue;
      }
      matched.push(order);
      if (matched.length === limit) {
        const moreInBatch = i < page.orders.length - 1;
        return {
          orders: matched,
          nextCursor: page.cursors[i] ?? null,
          hasMore: moreInBatch || page.hasMore,
          voucherByKey,
        };
      }
    }

    after = page.nextCursor;
    hasMore = page.hasMore && Boolean(after);
  }

  return { orders: matched, nextCursor: after, hasMore, voucherByKey };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const cursor = request.nextUrl.searchParams.get("cursor");
  const filter = parseFilter(request.nextUrl.searchParams.get("filter"));

  try {
    const page = await collectFilteredOrders({ limit, cursor, filter });

    const orderKeys = page.orders.map((order) => registryOrderKey(order));

    const [voucherByKey, sheetContacts] = await Promise.all([
      page.voucherByKey ?? getLoyaltyVoucherSendsByOrderKeys(orderKeys),
      lookupOrderSheetContactByOrderNumbers(orderKeys),
    ]);

    const emailForKey = (key: string) =>
      voucherByKey.get(key)?.email?.trim() ||
      sheetContacts.get(key)?.email?.trim() ||
      "";
    const [directoryIds, codeUsage] = await Promise.all([
      getShopifyCustomerIdsByEmails(
        orderKeys.map(emailForKey).filter(Boolean),
      ).catch((error) => {
        console.error("[loyalty-manual-send/orders] customer directory failed", error);
        return new Map<string, string>();
      }),
      resolveVoucherCodeUsage(
        orderKeys.map((key) => {
          const voucher = voucherByKey.get(key);
          return {
            key,
            discountCode: voucher?.discountCode,
            shopifyDiscountId: voucher?.shopifyDiscountId,
          };
        }),
      ),
    ]);

    const items = page.orders.map((order) => {
      const ctx = resolveManualLoyaltyContext(order);
      const ineligibleReason = ctx
        ? null
        : manualLoyaltyIneligibleReason(order);
      const orderKey = registryOrderKey(order);
      const voucher = voucherByKey.get(orderKey);
      const sheet = sheetContacts.get(orderKey);

      let voucherStatus: "none" | "pending" | "sent" | "failed" = "none";
      if (voucher) {
        voucherStatus = voucher.status;
      }

      const sheetEmail = sheet?.email?.trim() || "";

      return {
        shopifyOrderId: order.id,
        orderNumber: orderKey,
        orderName: orderLabel(order),
        customerName: sheet?.name?.trim() || "",
        customerPhone: sheet?.phone?.trim() || "",
        email:
          voucher?.email?.trim() ||
          sheetEmail ||
          "",
        emailSource: voucher?.email?.trim()
          ? "firestore"
          : sheetEmail
            ? "sheet"
            : "missing",
        shopifyCustomerId:
          voucher?.shopifyCustomerId ||
          directoryIds.get(emailForKey(orderKey).toLowerCase()) ||
          null,
        createdAt: order.created_at ?? null,
        orderTotalPkr: ctx?.orderTotalPkr ?? parseCustomerSpent(order.total_price),
        tierAmount: ctx?.tier.amount ?? null,
        eligible: Boolean(ctx),
        ineligibleReason,
        voucherStatus,
        discountCode: voucher?.discountCode ?? null,
        codeUsed: codeUsage.get(orderKey) ?? null,
        emailError: voucher?.emailError ?? null,
      };
    });

    return NextResponse.json({
      items,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
  } catch (error) {
    console.error("[loyalty-manual-send/orders] list failed", error);
    const message =
      error instanceof Error ? error.message : "Unknown error loading orders.";
    return NextResponse.json(
      {
        error: "Could not load paid orders from Shopify.",
        details: message,
      },
      { status: 500 },
    );
  }
}
