import {
  brandedCtaButtonHtml,
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { adminNotifyEmail, sendAdminEmail } from "@/lib/email/send";
import { resolveOrderProductDetails } from "@/lib/shopify/line-item-detail";
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

function formatStreet(order: ShopifyWebhookOrder): string {
  const a = order.shipping_address || order.billing_address;
  if (!a) return "";
  return [a.address1, a.address2].map((p) => str(p)).filter(Boolean).join(", ");
}

function contactPhone(order: ShopifyWebhookOrder): string {
  return str(
    order.shipping_address?.phone ||
      order.billing_address?.phone ||
      order.phone ||
      order.customer?.phone,
  );
}

function formatMoney(
  amount: string | number | null | undefined,
  currency?: string | null,
): string {
  const n = Number(amount ?? 0);
  const cur = str(currency) || "PKR";
  if (!Number.isFinite(n)) return `${cur} —`;
  return `${cur} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatItemHtml(
  detail: string,
  qty: string,
  price: string,
  variant: string,
): string {
  const [title, ...contents] = detail
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const variantBit =
    variant && variant.toLowerCase() !== "default title"
      ? ` <span style="color:${EMAIL_BRAND.muted}">(${escapeEmailHtml(variant)})</span>`
      : "";
  const contentsHtml = contents.length
    ? `<div style="margin:4px 0 0;color:${EMAIL_BRAND.muted};font-size:13px;line-height:1.45">${contents
        .map((line) => escapeEmailHtml(line))
        .join("<br/>")}</div>`
    : "";

  return (
    `<li style="margin:0 0 12px;color:${EMAIL_BRAND.ink};">` +
    `<div><strong>${escapeEmailHtml(title || "Item")}</strong>${variantBit} × ${escapeEmailHtml(qty)} — ${escapeEmailHtml(price)}</div>` +
    contentsHtml +
    `</li>`
  );
}

function formatItemPlain(
  detail: string,
  qty: string,
  price: string,
  variant: string,
): string {
  const [title, ...contents] = detail
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const variantBit =
    variant && variant.toLowerCase() !== "default title"
      ? ` (${variant})`
      : "";
  const contentLines = contents.map((line) => `    ${line}`).join("\n");
  return (
    `- ${title || "Item"}${variantBit} × ${qty} — ${price}` +
    (contentLines ? `\n${contentLines}` : "")
  );
}

/**
 * Email admin when a Shopify order is created (sheet webhook path).
 * Includes WhatsApp draft button → /wa?type=order_placed (emoji-safe).
 */
export async function notifyAdminNewOrder(
  order: ShopifyWebhookOrder,
  productDetails?: string[],
): Promise<void> {
  const to = adminNotifyEmail();
  const name = customerName(order);
  const orderNumber = str(order.order_number ?? order.name ?? order.id);
  const displayOrder = orderNumber
    ? orderNumber.startsWith("#")
      ? orderNumber
      : `#${orderNumber}`
    : "—";
  const email = str(order.email || order.customer?.email).toLowerCase();
  const phone = contactPhone(order);
  const city = str(
    order.shipping_address?.city || order.billing_address?.city,
  );
  const address = formatStreet(order);
  const note = str(order.note);
  const financial = str(order.financial_status) || "—";
  const gateway =
    (order.payment_gateway_names || []).filter(Boolean).join(", ") ||
    str(order.gateway) ||
    "—";

  const lineItems = order.line_items?.length ? order.line_items : [];
  const details =
    productDetails?.length === lineItems.length
      ? productDetails
      : await resolveOrderProductDetails(lineItems);

  const linesHtml = lineItems
    .map((item, index) => {
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      const variant = str(item.variant_title);
      return formatItemHtml(
        details[index] || str(item.title),
        qty,
        price,
        variant,
      );
    })
    .join("");

  const linesPlain = lineItems
    .map((item, index) => {
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      const variant = str(item.variant_title);
      return formatItemPlain(
        details[index] || str(item.title),
        qty,
        price,
        variant,
      );
    })
    .join("\n");

  const waPhone = normalizeWhatsAppPhone(phone);
  const shipAddress = [address, city].filter(Boolean).join(", ");
  const orderDetail = lineItems
    .map((item, index) => {
      const title = (
        details[index] ||
        str(item.title || item.name) ||
        "Item"
      )
        .split(/\n/)[0]
        .trim();
      const qty = str(item.quantity ?? 1) || "1";
      return `${title} × ${qty}`;
    })
    .join(", ");
  const totalLabel = formatMoney(order.total_price, order.currency);
  const portalUrl = str(order.order_status_url) || siteBaseUrl();

  const waLink = waPhone
    ? buildWhatsAppSiteLink({
        type: "order_placed",
        phone: waPhone,
        name,
        order: displayOrder,
        address: shipAddress || undefined,
        detail: orderDetail || undefined,
        total: totalLabel || undefined,
        portal: portalUrl || undefined,
      })
    : null;

  const ctaHtml = waLink
    ? brandedCtaButtonHtml({
        href: waLink,
        label: "Send WhatsApp — order placed",
        background: EMAIL_BRAND.whatsapp,
      }) +
      `<p style="margin:0;color:${EMAIL_BRAND.muted};font-size:12px;">Opens WhatsApp with order receipt (name, detail, address). Ask customer to confirm or correct. Tap <strong>Send</strong>.</p>`
    : `<p style="margin:0;color:#b42318;font-size:13px;">No valid customer phone — WhatsApp button skipped.</p>`;

  const subject = `New order ${displayOrder} — ${name}`;

  const html = buildBrandedEmailHtml({
    eyebrow: "New order notice",
    greetingName: name,
    introHtml:
      "A new order was placed on Al Barakah Honey. Review the details below, then confirm with the customer on WhatsApp if needed.",
    badgeText: "New order",
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
      { label: "Address", valueHtml: escapeEmailHtml(address || "—") },
      { label: "City", valueHtml: escapeEmailHtml(city || "—") },
      {
        label: "Payment",
        valueHtml: escapeEmailHtml(`${financial} / ${gateway}`),
      },
      {
        label: "Total",
        valueHtml: `<strong>${escapeEmailHtml(totalLabel)}</strong>`,
      },
      {
        label: "Subtotal",
        valueHtml: escapeEmailHtml(
          formatMoney(order.subtotal_price, order.currency),
        ),
      },
      {
        label: "Shipping / COD",
        valueHtml: escapeEmailHtml(
          formatMoney(
            order.total_shipping_price_set?.shop_money?.amount ??
              order.shipping_lines?.[0]?.price,
            order.currency,
          ),
        ),
      },
      { label: "Note", valueHtml: escapeEmailHtml(note || "—") },
    ],
    bodyHtml:
      `<p style="margin:0 0 8px;font-weight:700;color:${EMAIL_BRAND.brown};">Items</p>` +
      `<ul style="margin:0 0 8px;padding-left:18px;">${linesHtml || "<li>—</li>"}</ul>`,
    ctaHtml,
    footerNote:
      "Al Barakah Honey — new order notice for the ops team.",
    siteUrl: siteBaseUrl(),
  });

  const text =
    `Assalamualaikum,\n\n` +
    `A new order was placed.\n\n` +
    `Order: ${displayOrder}\n` +
    `Customer: ${name}\n` +
    `Contact: ${phone || "—"}\n` +
    `Email: ${email || "—"}\n` +
    `Address: ${address || "—"}\n` +
    `City: ${city || "—"}\n` +
    `Payment: ${financial} / ${gateway}\n` +
    `Total: ${totalLabel}\n` +
    `Note: ${note || "—"}\n\n` +
    `Items:\n${linesPlain || "—"}\n` +
    (waLink ? `\nSend WhatsApp — order placed:\n${waLink}\n` : "");

  await sendAdminEmail({ to, subject, html, text });
}
