import {
  buildTrackingStatusWhatsAppDraft,
} from "@/lib/whatsapp/tracking-status-drafts";

export type WhatsAppDraftType =
  | "delivery_issue"
  | "order_placed"
  | "status_update"
  | "tracking";

function formatOrderLabel(order?: string): string {
  let value = (order || "").trim();
  if (value && !value.startsWith("#") && value.toLowerCase() !== "your order") {
    value = `#${value}`;
  }
  if (!value) return "your order";
  return value;
}

function cleanLine(value?: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pre-filled WhatsApp body when a new Shopify order is placed. */
export function buildOrderPlacedWhatsAppDraft(params: {
  name?: string;
  order?: string;
  address?: string;
  detail?: string;
  total?: string;
  portal?: string;
}): string {
  const name = cleanLine(params.name) || "Customer";
  const order = formatOrderLabel(params.order);
  const address = cleanLine(params.address);
  const detail = cleanLine(params.detail);
  const total = cleanLine(params.total);
  const portal = cleanLine(params.portal) || siteBaseUrl();

  const receiptLines = [
    `Name: ${name}`,
    detail ? `Order detail: ${detail}` : `Order: ${order}`,
    address ? `Address: ${address}` : "",
    total ? `Total: ${total}` : "",
  ].filter(Boolean);

  return (
    `Assalamualaikum ${name},\n\n` +
    `Your Al Barakah Honey order ${order} is confirmed. It will be dispatched soon.\n\n` +
    `${receiptLines.join("\n")}\n\n` +
    `If your name, address, or order detail is wrong, please reply here.\n\n` +
    `Order page: ${portal}\n` +
    `Website: ${siteBaseUrl()}\n\n` +
    `Thank you for choosing Al Barakah Honey`
  );
}

/**
 * @deprecated Prefer type=tracking — kept for old email links.
 */
export function buildDeliveryIssueWhatsAppDraft(params: {
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
}): string {
  return buildTrackingStatusWhatsAppDraft(params);
}

/**
 * @deprecated Prefer type=tracking — kept for old email links.
 */
export function buildStatusUpdateWhatsAppDraft(params: {
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
}): string {
  return buildTrackingStatusWhatsAppDraft(params);
}

export function buildWhatsAppDraft(
  type: WhatsAppDraftType,
  params: {
    name?: string;
    order?: string;
    status?: string;
    cn?: string;
    address?: string;
    detail?: string;
    total?: string;
    portal?: string;
  },
): string {
  if (type === "order_placed") {
    return buildOrderPlacedWhatsAppDraft(params);
  }
  // tracking | status_update | delivery_issue → per-status drafts
  return buildTrackingStatusWhatsAppDraft(params);
}

/** Digits-only international phone for wa.me (e.g. 923001234567). */
export function normalizeWhatsAppPhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("92") && d.length >= 12) return d;
  if (d.startsWith("0") && d.length >= 11) return `92${d.slice(1)}`;
  if (d.length === 10) return `92${d}`;
  if (d.length >= 11) return d;
  return "";
}

export function siteBaseUrl(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = String(raw)
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/+$/, "");
    if (!cleaned) continue;
    // Never put localhost into customer/admin WhatsApp links (common Vercel misconfig)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleaned)) {
      continue;
    }
    return cleaned;
  }

  return "https://www.albarakahoney.com";
}

/** ASCII-only link for emails → /wa → WhatsApp (emoji-safe). */
export function buildWhatsAppSiteLink(params: {
  type: WhatsAppDraftType;
  phone: string;
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
  address?: string;
  detail?: string;
  total?: string;
  portal?: string;
}): string | null {
  const phone = normalizeWhatsAppPhone(params.phone);
  if (!phone) return null;

  const qs = new URLSearchParams();
  qs.set("type", params.type);
  qs.set("phone", phone);
  if (params.name) qs.set("name", params.name);
  if (params.order) qs.set("order", params.order);
  if (params.status) qs.set("status", params.status);
  if (params.cn) qs.set("cn", params.cn);
  if (params.address) qs.set("address", params.address);
  if (params.detail) qs.set("detail", params.detail);
  if (params.total) qs.set("total", params.total);
  if (params.portal) qs.set("portal", params.portal);

  return `${siteBaseUrl()}/wa?${qs.toString()}`;
}
