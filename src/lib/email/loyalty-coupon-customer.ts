import { sendLoyaltyCouponEmail } from "@/lib/email/loyalty-coupon-email";
import type { OrderLoyaltyContext } from "@/lib/loyalty/order-loyalty-context";
import { resolveShopifyCustomerIdForOrder } from "@/lib/loyalty/resolve-shopify-customer-id";
import {
  isLoyaltyShopifyAutoCreateEnabled,
  loyaltyTierWithCode,
  type LoyaltyTier,
} from "@/lib/loyalty/segments";
import {
  claimLoyaltyVoucherSendSlot,
  finalizeLoyaltyVoucherSend,
  getLoyaltyVoucherSend,
  normalizeLoyaltyCustomerEmail,
  persistLoyaltyVoucherDiscountCode,
  releaseLoyaltyVoucherSendSlot,
} from "@/lib/loyalty/voucher-email-registry";
import { createLoyaltyDiscountCodeForCustomer } from "@/lib/shopify/admin/create-loyalty-discount-code";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

export type LoyaltyCouponCustomerNotifyResult = {
  sent: boolean;
  skipped?: boolean;
  skipReason?:
    | "no_email"
    | "already_sent"
    | "mailer_not_configured"
    | "shopify_auto_create_disabled"
    | "no_shopify_customer"
    | "shopify_discount_failed";
  tier?: LoyaltyTier;
};

function str(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function customerName(order: ShopifyWebhookOrder): string {
  const fromCustomer = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromCustomer) return fromCustomer;
  const shipping = order.shipping_address;
  if (shipping?.name) return shipping.name;
  const fromShip = [shipping?.first_name, shipping?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromShip) return fromShip;
  const billing = order.billing_address;
  if (billing?.name) return billing.name;
  return (
    [billing?.first_name, billing?.last_name].filter(Boolean).join(" ").trim() ||
    "Customer"
  );
}

function orderNumberForRegistry(order: ShopifyWebhookOrder): string {
  return str(order.order_number ?? order.name ?? order.id);
}

function customerFirstNameForDiscountCode(order: ShopifyWebhookOrder): string {
  const fromCustomer = str(order.customer?.first_name);
  if (fromCustomer) return fromCustomer;
  const shipping = order.shipping_address;
  if (shipping?.first_name) return str(shipping.first_name);
  if (shipping?.name) return str(shipping.name).split(/\s+/)[0] || "";
  const billing = order.billing_address;
  if (billing?.first_name) return str(billing.first_name);
  return customerName(order).split(/\s+/)[0] || "Customer";
}

async function ensureUniqueDiscountCode(
  order: ShopifyWebhookOrder,
  ctx: OrderLoyaltyContext,
  orderNumber: string,
  existingDiscountCode?: string,
): Promise<LoyaltyTier> {
  if (existingDiscountCode?.trim()) {
    return loyaltyTierWithCode(ctx.tier.amount, existingDiscountCode.trim());
  }

  const shopifyCustomerId = await resolveShopifyCustomerIdForOrder(order);
  if (!shopifyCustomerId) {
    throw new Error("NO_SHOPIFY_CUSTOMER");
  }

  const created = await createLoyaltyDiscountCodeForCustomer({
    shopifyCustomerId,
    amount: ctx.tier.amount,
    orderLabel: orderNumber,
    customerFirstName: customerFirstNameForDiscountCode(order),
  });

  await persistLoyaltyVoucherDiscountCode(orderNumber, {
    discountCode: created.code,
    shopifyDiscountId: created.shopifyDiscountId,
    tierCode: created.code,
  });

  return loyaltyTierWithCode(created.amount, created.code);
}

export async function notifyCustomerLoyaltyCoupon(
  order: ShopifyWebhookOrder,
  ctx: OrderLoyaltyContext,
): Promise<LoyaltyCouponCustomerNotifyResult> {
  if (!isLoyaltyShopifyAutoCreateEnabled()) {
    console.warn(
      "[Loyalty Email] Skipped — loyalty Shopify auto-create is disabled",
    );
    return {
      sent: false,
      skipped: true,
      skipReason: "shopify_auto_create_disabled",
    };
  }

  const rawEmail = str(order.email || order.customer?.email);
  const to = normalizeLoyaltyCustomerEmail(rawEmail);
  if (!to) {
    console.warn("[Loyalty Email] Skipped — no checkout email on order");
    return { sent: false, skipped: true, skipReason: "no_email" };
  }

  const orderNumber = orderNumberForRegistry(order);
  let existing = await getLoyaltyVoucherSend(orderNumber);

  if (existing?.status === "sent") {
    console.log(
      `[Loyalty Email] Skipped — voucher already sent for order ${orderNumber}`,
    );
    return { sent: false, skipped: true, skipReason: "already_sent" };
  }

  if (!existing) {
    const claim = await claimLoyaltyVoucherSendSlot({
      orderNumber,
      email: to,
      tierCode: `PENDING-${ctx.tier.amount}`,
      tierAmount: ctx.tier.amount,
      orderTotalPkr: ctx.orderTotalPkr,
      shopifyOrderId: order.id,
    });
    if (claim === "already_sent") {
      existing = await getLoyaltyVoucherSend(orderNumber);
      if (existing?.status === "sent") {
        return { sent: false, skipped: true, skipReason: "already_sent" };
      }
    }
  }

  const name = customerName(order);
  let tierForEmail: LoyaltyTier;

  try {
    tierForEmail = await ensureUniqueDiscountCode(
      order,
      ctx,
      orderNumber,
      existing?.discountCode ?? (await getLoyaltyVoucherSend(orderNumber))?.discountCode,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NO_SHOPIFY_CUSTOMER") {
      console.warn(
        `[Loyalty Email] Skipped — no Shopify customer for order ${orderNumber}`,
      );
      await releaseLoyaltyVoucherSendSlot(orderNumber);
      return {
        sent: false,
        skipped: true,
        skipReason: "no_shopify_customer",
      };
    }
    console.error("[Loyalty Email] Shopify discount create failed:", err);
    await releaseLoyaltyVoucherSendSlot(orderNumber);
    return {
      sent: false,
      skipped: true,
      skipReason: "shopify_discount_failed",
    };
  }

  try {
    const result = await sendLoyaltyCouponEmail({
      to,
      greetingName: name,
      tier: tierForEmail,
    });

    if (result.sent) {
      await finalizeLoyaltyVoucherSend(orderNumber);
      return { ...result, tier: tierForEmail };
    }

    await releaseLoyaltyVoucherSendSlot(orderNumber);
    if (result.skipped) {
      return {
        sent: false,
        skipped: true,
        skipReason: "mailer_not_configured",
        tier: tierForEmail,
      };
    }
    return { ...result, tier: tierForEmail };
  } catch (err) {
    await releaseLoyaltyVoucherSendSlot(orderNumber);
    throw err;
  }
}
