import { sendLoyaltyCouponEmail } from "@/lib/email/loyalty-coupon-email";
import type { OrderLoyaltyContext } from "@/lib/loyalty/order-loyalty-context";
import {
  claimLoyaltyVoucherSendSlot,
  finalizeLoyaltyVoucherSend,
  normalizeLoyaltyCustomerEmail,
  releaseLoyaltyVoucherSendSlot,
} from "@/lib/loyalty/voucher-email-registry";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

export type LoyaltyCouponCustomerNotifyResult = {
  sent: boolean;
  skipped?: boolean;
  skipReason?: "no_email" | "already_sent" | "mailer_not_configured";
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

export async function notifyCustomerLoyaltyCoupon(
  order: ShopifyWebhookOrder,
  ctx: OrderLoyaltyContext,
): Promise<LoyaltyCouponCustomerNotifyResult> {
  const rawEmail = str(order.email || order.customer?.email);
  const to = normalizeLoyaltyCustomerEmail(rawEmail);
  if (!to) {
    console.warn("[Loyalty Email] Skipped — no checkout email on order");
    return { sent: false, skipped: true, skipReason: "no_email" };
  }

  const orderNumber = orderNumberForRegistry(order);
  const claim = await claimLoyaltyVoucherSendSlot({
    orderNumber,
    email: to,
    tierCode: ctx.tier.code,
    tierAmount: ctx.tier.amount,
    orderTotalPkr: ctx.orderTotalPkr,
    shopifyOrderId: order.id,
  });
  if (claim === "already_sent") {
    console.log(
      `[Loyalty Email] Skipped — voucher already sent for order ${orderNumber}`,
    );
    return { sent: false, skipped: true, skipReason: "already_sent" };
  }

  const name = customerName(order);
  try {
    const result = await sendLoyaltyCouponEmail({
      to,
      greetingName: name,
      tier: ctx.tier,
    });

    if (result.sent) {
      await finalizeLoyaltyVoucherSend(orderNumber);
      return result;
    }

    await releaseLoyaltyVoucherSendSlot(orderNumber);
    if (result.skipped) {
      return {
        sent: false,
        skipped: true,
        skipReason: "mailer_not_configured",
      };
    }
    return result;
  } catch (err) {
    await releaseLoyaltyVoucherSendSlot(orderNumber);
    throw err;
  }
}
