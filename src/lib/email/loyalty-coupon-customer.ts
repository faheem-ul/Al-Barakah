import {
  brandedCtaButtonHtml,
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { sendAdminEmail } from "@/lib/email/send";
import {
  formatLoyaltyAmount,
  getLoyaltyCouponConfig,
} from "@/lib/loyalty/segments";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";
import { siteBaseUrl } from "@/lib/whatsapp/delivery-issue-draft";

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
  const { code, amount } = getLoyaltyCouponConfig();
  const amountLabel = formatLoyaltyAmount(amount);
  const shopUrl = siteBaseUrl();

  const subject = `${amountLabel} off your next order — code ${code}`;

  const html = buildBrandedEmailHtml({
    eyebrow: "Loyalty coupon",
    greetingName: name,
    introHtml:
      "Thank you for your order. As a returning customer, you can save on your next purchase with the coupon below.",
    badgeText: `${amountLabel} off your next order`,
    badgeVariant: "brown",
    rows: [
      {
        label: "Coupon code",
        valueHtml: `<strong style="font-size:16px;letter-spacing:0.08em;">${escapeEmailHtml(code)}</strong>`,
      },
      {
        label: "Discount",
        valueHtml: `<strong>${escapeEmailHtml(amountLabel)}</strong>`,
      },
      {
        label: "How to use",
        valueHtml:
          "Enter the code at checkout on your <strong>next</strong> order. One use per customer.",
      },
    ],
    bodyHtml: `<p style="margin:0;font-size:13px;line-height:1.55;color:${EMAIL_BRAND.muted};">This offer is for customers who have ordered with us before.</p>`,
    ctaHtml: brandedCtaButtonHtml({
      href: shopUrl,
      label: "Shop again",
      background: EMAIL_BRAND.brown,
    }),
    siteUrl: shopUrl,
  });

  const text =
    `Assalamualaikum${name && name !== "Customer" ? `, ${name}` : ""},\n\n` +
    `Thank you for your order. Save on your next purchase with this coupon:\n\n` +
    `Coupon code: ${code}\n` +
    `Discount: ${amountLabel} off your next order\n\n` +
    `Enter the code at checkout. One use per customer. For customers who have ordered with us before.\n\n` +
    `Shop again: ${shopUrl}\n`;

  return sendAdminEmail({ to, subject, html, text });
}
