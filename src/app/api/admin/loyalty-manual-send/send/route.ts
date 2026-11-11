import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  notifyAdminLoyaltyCouponAfterCustomer,
  notifyCustomerLoyaltyCoupon,
} from "@/lib/email/loyalty-coupon-customer";
import { resolveManualLoyaltyContactDetails } from "@/lib/loyalty/manual-send-contact";
import { getShopifyCustomerIdByEmail } from "@/lib/loyalty/shopify-customer-directory";
import {
  manualLoyaltyIneligibleReason,
  resolveManualLoyaltyContext,
} from "@/lib/loyalty/order-loyalty-context";
import {
  getLoyaltyVoucherSend,
  LOYALTY_VOUCHER_SENDS_COLLECTION,
  normalizeLoyaltyCustomerEmail,
  normalizeLoyaltyOrderKey,
} from "@/lib/loyalty/voucher-email-registry";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  applyManualLoyaltyOrderContact,
  fetchShopifyOrderForManualLoyalty,
} from "@/lib/shopify/admin/loyalty-manual-send-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCustomerId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function recordManualSendMetadata(
  orderNumber: string | number,
  adminEmail: string,
): Promise<void> {
  const key = normalizeLoyaltyOrderKey(orderNumber);
  if (!key) return;

  const ref = getAdminDb()
    .collection(LOYALTY_VOUCHER_SENDS_COLLECTION)
    .doc(key);
  const snap = await ref.get();
  if (!snap.exists) return;

  await ref.update({
    manualSendAt: FieldValue.serverTimestamp(),
    manualSendBy: adminEmail.slice(0, 320),
  });
}

async function persistManualContact(
  orderNumber: string | number,
  params: {
    email: string;
    shopifyCustomerId?: number | null;
    customerName?: string;
    customerPhone?: string;
  },
): Promise<void> {
  const key = normalizeLoyaltyOrderKey(orderNumber);
  if (!key) return;

  const ref = getAdminDb()
    .collection(LOYALTY_VOUCHER_SENDS_COLLECTION)
    .doc(key);
  const snap = await ref.get();
  if (!snap.exists) return;

  await ref.update({
    email: params.email,
    ...(params.shopifyCustomerId
      ? { shopifyCustomerId: String(params.shopifyCustomerId) }
      : {}),
    ...(params.customerName?.trim()
      ? { customerName: params.customerName.trim().slice(0, 200) }
      : {}),
    ...(params.customerPhone?.trim()
      ? { customerPhone: params.customerPhone.trim().slice(0, 80) }
      : {}),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: {
    shopifyOrderId?: number | string;
    email?: string;
    shopifyCustomerId?: number | string;
    customerName?: string;
    customerPhone?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shopifyOrderId = body.shopifyOrderId;
  if (shopifyOrderId === undefined || shopifyOrderId === null || shopifyOrderId === "") {
    return NextResponse.json(
      { error: "shopifyOrderId is required" },
      { status: 400 },
    );
  }

  try {
    const order = await fetchShopifyOrderForManualLoyalty(shopifyOrderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderKey = String(
      order.order_number ?? order.name ?? order.id,
    )
      .trim()
      .replace(/^#+/, "");

    const voucher = await getLoyaltyVoucherSend(orderKey);
    const email =
      normalizeLoyaltyCustomerEmail(body.email || "") ||
      normalizeLoyaltyCustomerEmail(voucher?.email || "");

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Customer email is required. Enter it in the table (Shopify Admin API cannot return emails on your plan).",
        },
        { status: 400 },
      );
    }

    const shopifyCustomerId =
      parseCustomerId(body.shopifyCustomerId) ||
      parseCustomerId(voucher?.shopifyCustomerId) ||
      (await getShopifyCustomerIdByEmail(email));

    const contactDetails = await resolveManualLoyaltyContactDetails({
      orderKey,
      email,
      shopifyCustomerId,
      customerNameOverride: body.customerName,
      phoneOverride: body.customerPhone,
    });

    const orderForSend = applyManualLoyaltyOrderContact(order, {
      email: contactDetails.email,
      shopifyCustomerId,
      customerName: contactDetails.customerName,
      phone: contactDetails.phone,
    });

    const ctx = resolveManualLoyaltyContext(orderForSend);
    if (!ctx) {
      return NextResponse.json(
        {
          error:
            manualLoyaltyIneligibleReason(orderForSend) ||
            "Order is not eligible for a loyalty voucher",
        },
        { status: 400 },
      );
    }

    await persistManualContact(orderKey, {
      email,
      shopifyCustomerId,
      customerName: contactDetails.customerName,
      customerPhone: contactDetails.phone,
    }).catch(() => undefined);

    const result = await notifyCustomerLoyaltyCoupon(orderForSend, ctx, {
      allowCustomerEmailSearch: false,
    });

    if (!shopifyCustomerId && result.skipReason === "no_shopify_customer") {
      return NextResponse.json(
        {
          ok: false,
          sent: false,
          skipReason: result.skipReason,
          error:
            "Shopify customer ID is required. Add the numeric customer ID from the order page in Shopify admin.",
        },
        { status: 400 },
      );
    }

    try {
      await notifyAdminLoyaltyCouponAfterCustomer(
        orderForSend,
        ctx,
        result,
      );
    } catch (adminErr) {
      console.error("[loyalty-manual-send/send] admin email failed", adminErr);
    }

    if (result.sent) {
      await recordManualSendMetadata(
        orderKey,
        auth.admin.email || auth.admin.uid,
      );
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      skipped: result.skipped,
      skipReason: result.skipReason,
      emailError: result.emailError,
      tierCode: result.tier?.code ?? null,
      customerName: contactDetails.customerName || null,
    });
  } catch (error) {
    console.error("[loyalty-manual-send/send] failed", error);
    return NextResponse.json(
      { error: "Failed to send loyalty voucher email." },
      { status: 500 },
    );
  }
}
