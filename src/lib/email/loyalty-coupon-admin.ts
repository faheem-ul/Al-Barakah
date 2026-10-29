import {
  brandedCtaButtonHtml,
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { adminNotifyEmail, sendAdminEmail } from "@/lib/email/send";
import type { OrderLoyaltyContext } from "@/lib/loyalty/order-loyalty-context";
import { formatLoyaltyAmount } from "@/lib/loyalty/segments";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";
import {
  buildWhatsAppSiteLink,
  normalizeWhatsAppPhone,
  siteBaseUrl,
} from "@/lib/whatsapp/delivery-issue-draft";

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
  return "Customer";
}

function contactPhone(order: ShopifyWebhookOrder): string {
  return str(
    order.shipping_address?.phone ||
      order.billing_address?.phone ||
      order.phone ||
      order.customer?.phone,
  );
}

/**
 * Admin notice after order is paid — send customer their tier loyalty code via WhatsApp.
 */
export async function notifyAdminLoyaltyCoupon(
  order: ShopifyWebhookOrder,
  ctx: OrderLoyaltyContext,
): Promise<void> {
  const to = adminNotifyEmail();
  const name = customerName(order);
  const orderNumber = str(order.order_number ?? order.name ?? order.id);
  const displayOrder = orderNumber
    ? orderNumber.startsWith("#")
      ? orderNumber
      : `#${orderNumber}`
    : "—";
  const phone = contactPhone(order);
  const email = str(order.email || order.customer?.email).toLowerCase();
  const { code, amount } = ctx.tier;
  const amountLabel = formatLoyaltyAmount(amount);
  const spentLabel = formatLoyaltyAmount(ctx.lifetimeSpentPkr);

  const waPhone = normalizeWhatsAppPhone(phone);
  const waLoyaltyLink = waPhone
    ? buildWhatsAppSiteLink({
        type: "loyalty_coupon",
        phone: waPhone,
        name,
        code,
        couponAmount: String(amount),
      })
    : null;

  const ctaHtml = waLoyaltyLink
    ? brandedCtaButtonHtml({
        href: waLoyaltyLink,
        label: "Send WhatsApp — loyalty coupon",
        background: EMAIL_BRAND.whatsapp,
      }) +
      `<p style="margin:0;color:${EMAIL_BRAND.muted};font-size:12px;">Message includes <strong>${escapeEmailHtml(code)}</strong> (${escapeEmailHtml(amountLabel)} off). Tap <strong>Send</strong>.</p>`
    : `<p style="margin:0;color:#b42318;font-size:13px;">No valid customer phone — WhatsApp skipped.</p>`;

  const subject = `Loyalty coupon ${code} — order ${displayOrder} (${name})`;

  const html = buildBrandedEmailHtml({
    eyebrow: "Loyalty coupon (paid order)",
    greetingName: "Team",
    introHtml:
      "This order is paid. Send the customer their loyalty voucher code on WhatsApp using the button below.",
    badgeText: code,
    badgeVariant: "brown",
    rows: [
      { label: "Order", valueHtml: `<strong>${escapeEmailHtml(displayOrder)}</strong>` },
      { label: "Customer", valueHtml: escapeEmailHtml(name) },
      { label: "Contact", valueHtml: escapeEmailHtml(phone || "—") },
      {
        label: "Email",
        valueHtml: email
          ? `<a href="mailto:${escapeEmailHtml(email)}" style="color:${EMAIL_BRAND.brown};">${escapeEmailHtml(email)}</a>`
          : "—",
      },
      { label: "Lifetime spent", valueHtml: escapeEmailHtml(spentLabel) },
      { label: "Orders", valueHtml: escapeEmailHtml(String(ctx.ordersCount)) },
      {
        label: "Coupon",
        valueHtml: `<strong>${escapeEmailHtml(code)}</strong> — ${escapeEmailHtml(amountLabel)} off next order`,
      },
    ],
    ctaHtml,
    footerNote: "Al Barakah Honey — loyalty notice for the ops team.",
    siteUrl: siteBaseUrl(),
  });

  const text =
    `Order ${displayOrder} is paid.\n\n` +
    `Customer: ${name}\n` +
    `Phone: ${phone || "—"}\n` +
    `Email: ${email || "—"}\n` +
    `Lifetime spent: ${spentLabel}\n` +
    `Orders: ${ctx.ordersCount}\n` +
    `Coupon: ${code} (${amountLabel} off)\n\n` +
    (waLoyaltyLink ? `WhatsApp:\n${waLoyaltyLink}\n` : "");

  await sendAdminEmail({ to, subject, html, text });
}
