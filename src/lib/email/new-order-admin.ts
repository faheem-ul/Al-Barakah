import { adminNotifyEmail, sendAdminEmail } from "@/lib/email/send";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";
import {
  buildWhatsAppSiteLink,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp/delivery-issue-draft";

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowHtml(label: string, value: string): string {
  return (
    `<tr>` +
    `<td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#222">${value}</td>` +
    `</tr>`
  );
}

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

function formatMoney(amount: string | number | null | undefined, currency?: string | null): string {
  const n = Number(amount ?? 0);
  const cur = str(currency) || "PKR";
  if (!Number.isFinite(n)) return `${cur} —`;
  return `${cur} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

/**
 * Email admin when a Shopify order is created (sheet webhook path).
 * Includes WhatsApp draft button → /wa?type=order_placed (emoji-safe).
 */
export async function notifyAdminNewOrder(
  order: ShopifyWebhookOrder,
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
  const gateway = (order.payment_gateway_names || [])
    .filter(Boolean)
    .join(", ") || str(order.gateway) || "—";

  const lineItems = order.line_items?.length
    ? order.line_items
    : [];

  const linesHtml = lineItems
    .map((item) => {
      const title = escapeHtml(str(item.title || item.name) || "Item");
      const variant = str(item.variant_title);
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      const variantBit =
        variant && variant.toLowerCase() !== "default title"
          ? ` <span style="color:#666">(${escapeHtml(variant)})</span>`
          : "";
      return `<li style="margin:0 0 6px">${title}${variantBit} × ${escapeHtml(qty)} — ${escapeHtml(price)}</li>`;
    })
    .join("");

  const linesPlain = lineItems
    .map((item) => {
      const title = str(item.title || item.name) || "Item";
      const variant = str(item.variant_title);
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      const variantBit =
        variant && variant.toLowerCase() !== "default title"
          ? ` (${variant})`
          : "";
      return `- ${title}${variantBit} × ${qty} — ${price}`;
    })
    .join("\n");

  const waPhone = normalizeWhatsAppPhone(phone);
  const waLink = waPhone
    ? buildWhatsAppSiteLink({
        type: "order_placed",
        phone: waPhone,
        name,
        order: displayOrder,
      })
    : null;

  const waBlockHtml = waLink
    ? `<p style="margin:18px 0 8px">` +
      `<a href="${escapeHtml(waLink)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:700;border-radius:6px;">Send WhatsApp — order placed</a>` +
      `</p>` +
      `<p style="color:#666;font-size:12px;margin:0 0 12px">Opens WhatsApp with: order confirmed, will be dispatched soon. Tap <strong>Send</strong>.</p>`
    : `<p style="color:#a00;font-size:13px">No valid customer phone — WhatsApp button skipped.</p>`;

  const waBlockPlain = waLink
    ? `\nSend WhatsApp — order placed:\n${waLink}\n`
    : "\n(No WhatsApp link — missing phone)\n";

  const subject = `New order ${displayOrder} — ${name}`;

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">` +
    `<p>Assalamualaikum,</p>` +
    `<p>A new order was placed on Al Barakah Honey.</p>` +
    `<table style="border-collapse:collapse;margin:16px 0">` +
    rowHtml("Order", escapeHtml(displayOrder)) +
    rowHtml("Customer", escapeHtml(name)) +
    rowHtml("Contact", escapeHtml(phone || "—")) +
    rowHtml("Email", escapeHtml(email || "—")) +
    rowHtml("Address", escapeHtml(address || "—")) +
    rowHtml("City", escapeHtml(city || "—")) +
    rowHtml("Payment", escapeHtml(`${financial} / ${gateway}`)) +
    rowHtml("Total", escapeHtml(formatMoney(order.total_price, order.currency))) +
    rowHtml("Subtotal", escapeHtml(formatMoney(order.subtotal_price, order.currency))) +
    rowHtml("Shipping / COD", escapeHtml(formatMoney(order.total_shipping_price_set?.shop_money?.amount ?? order.shipping_lines?.[0]?.price, order.currency))) +
    rowHtml("Note", escapeHtml(note || "—")) +
    `</table>` +
    `<p style="margin:12px 0 4px"><strong>Items</strong></p>` +
    `<ul style="margin:0 0 16px;padding-left:18px">${linesHtml || "<li>—</li>"}</ul>` +
    waBlockHtml +
    `<p style="color:#666;font-size:12px">Al Barakah Honey — new order notice</p>` +
    `</div>`;

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
    `Total: ${formatMoney(order.total_price, order.currency)}\n` +
    `Note: ${note || "—"}\n\n` +
    `Items:\n${linesPlain || "—"}\n` +
    waBlockPlain;

  await sendAdminEmail({ to, subject, html, text });
}
