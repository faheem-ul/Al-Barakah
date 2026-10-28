import { sendLoyaltyCouponEmail } from "@/lib/email/loyalty-coupon-email";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

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

/**
 * Standalone loyalty coupon email (same branded layout as order confirmation).
 */
export async function notifyCustomerLoyaltyCoupon(
  order: ShopifyWebhookOrder,
): Promise<{ sent: boolean; skipped?: boolean }> {
  const to = str(order.email || order.customer?.email).toLowerCase();
  if (!to) {
    console.warn("[Loyalty Email] Skipped — no checkout email on order");
    return { sent: false, skipped: true };
  }

  const name = customerName(order);
  return sendLoyaltyCouponEmail({ to, greetingName: name });
}
