import {
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { sendAdminEmail } from "@/lib/email/send";
import { resolveOrderProductDetails } from "@/lib/shopify/line-item-detail";
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

function formatStreet(order: ShopifyWebhookOrder): string {
  const a = order.shipping_address || order.billing_address;
  if (!a) return "";
  return [a.address1, a.address2].map((p) => str(p)).filter(Boolean).join(", ");
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

function formatItemHtml(detail: string, qty: string, price: string): string {
  const [title, ...contents] = detail
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const contentsHtml = contents.length
    ? `<div style="margin:4px 0 0;color:${EMAIL_BRAND.muted};font-size:13px;line-height:1.45">${contents
        .map((line) => escapeEmailHtml(line))
        .join("<br/>")}</div>`
    : "";

  return (
    `<li style="margin:0 0 12px;color:${EMAIL_BRAND.ink};">` +
    `<div><strong>${escapeEmailHtml(title || "Item")}</strong> × ${escapeEmailHtml(qty)} — ${escapeEmailHtml(price)}</div>` +
    contentsHtml +
    `</li>`
  );
}

function formatItemPlain(detail: string, qty: string, price: string): string {
  const [title, ...contents] = detail
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const contentLines = contents.map((line) => `    ${line}`).join("\n");
  return (
    `- ${title || "Item"} × ${qty} — ${price}` +
    (contentLines ? `\n${contentLines}` : "")
  );
}

/**
 * Order confirmation email to the customer (checkout email).
 * Includes combo deal name + included products when available.
 */
export async function notifyCustomerNewOrder(
  order: ShopifyWebhookOrder,
  productDetails?: string[],
): Promise<{ sent: boolean; skipped?: boolean }> {
  const to = str(order.email || order.customer?.email).toLowerCase();
  if (!to) {
    console.warn("[Customer Email] Skipped — no checkout email on order");
    return { sent: false, skipped: true };
  }

  const name = customerName(order);
  const orderNumber = str(order.order_number ?? order.name ?? order.id);
  const displayOrder = orderNumber
    ? orderNumber.startsWith("#")
      ? orderNumber
      : `#${orderNumber}`
    : "—";
  const city = str(
    order.shipping_address?.city || order.billing_address?.city,
  );
  const address = formatStreet(order);
  const totalLabel = formatMoney(order.total_price, order.currency);

  const lineItems = order.line_items?.length ? order.line_items : [];
  const details =
    productDetails?.length === lineItems.length
      ? productDetails
      : await resolveOrderProductDetails(lineItems);

  const linesHtml = lineItems
    .map((item, index) => {
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      return formatItemHtml(details[index] || str(item.title), qty, price);
    })
    .join("");

  const linesPlain = lineItems
    .map((item, index) => {
      const qty = str(item.quantity ?? 1);
      const price = formatMoney(item.price, order.currency);
      return formatItemPlain(details[index] || str(item.title), qty, price);
    })
    .join("\n");

  const subject = `Order confirmed ${displayOrder} — Al Barakah Honey`;

  const html = buildBrandedEmailHtml({
    eyebrow: "Order confirmation",
    greetingName: name,
    introHtml:
      "Thank you for your order. We have received it and will prepare it for dispatch soon.",
    badgeText: "Order confirmed",
    badgeVariant: "mint",
    rows: [
      {
        label: "Order number",
        valueHtml: `<strong>${escapeEmailHtml(displayOrder)}</strong>`,
      },
      { label: "Ship to", valueHtml: escapeEmailHtml(address || "—") },
      { label: "City", valueHtml: escapeEmailHtml(city || "—") },
      {
        label: "Total",
        valueHtml: `<strong>${escapeEmailHtml(totalLabel)}</strong>`,
      },
    ],
    bodyHtml:
      `<p style="margin:0 0 8px;font-weight:700;color:${EMAIL_BRAND.brown};">Your items</p>` +
      `<ul style="margin:0 0 8px;padding-left:18px;">${linesHtml || "<li>—</li>"}</ul>`,
    footerNote:
      "You will receive another email when your shipment status updates.",
    siteUrl: siteBaseUrl(),
  });

  const text =
    `Assalamualaikum${name && name !== "Customer" ? `, ${name}` : ""},\n\n` +
    `Thank you for your order. We have received it and will prepare it for dispatch soon.\n\n` +
    `Order: ${displayOrder}\n` +
    `Ship to: ${address || "—"}\n` +
    `City: ${city || "—"}\n` +
    `Total: ${totalLabel}\n\n` +
    `Your items:\n${linesPlain || "—"}\n`;

  return sendAdminEmail({ to, subject, html, text });
}
