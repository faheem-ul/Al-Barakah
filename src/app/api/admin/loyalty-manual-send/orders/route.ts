import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  manualLoyaltyIneligibleReason,
  resolveManualLoyaltyContext,
} from "@/lib/loyalty/order-loyalty-context";
import { lookupOrderSheetContactByOrderNumbers } from "@/lib/google/sheets";
import { getShopifyCustomerIdsByEmails } from "@/lib/loyalty/shopify-customer-directory";
import { getLoyaltyVoucherSendsByOrderKeys } from "@/lib/loyalty/voucher-email-registry";
import { fetchPaidOrdersForManualLoyalty } from "@/lib/shopify/admin/loyalty-manual-send-orders";
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const cursor = request.nextUrl.searchParams.get("cursor");

  try {
    const page = await fetchPaidOrdersForManualLoyalty({
      limit,
      cursor,
    });

    const orderKeys = page.orders.map((order) => registryOrderKey(order));

    const [voucherByKey, sheetContacts] = await Promise.all([
      getLoyaltyVoucherSendsByOrderKeys(orderKeys),
      lookupOrderSheetContactByOrderNumbers(orderKeys),
    ]);

    const emailForKey = (key: string) =>
      voucherByKey.get(key)?.email?.trim() ||
      sheetContacts.get(key)?.email?.trim() ||
      "";
    const directoryIds = await getShopifyCustomerIdsByEmails(
      orderKeys.map(emailForKey).filter(Boolean),
    ).catch((error) => {
      console.error("[loyalty-manual-send/orders] customer directory failed", error);
      return new Map<string, string>();
    });

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
        orderTotalPkr: ctx?.orderTotalPkr ?? 0,
        tierAmount: ctx?.tier.amount ?? null,
        eligible: Boolean(ctx),
        ineligibleReason,
        voucherStatus,
        discountCode: voucher?.discountCode ?? null,
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
