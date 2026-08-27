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

/** Pre-filled WhatsApp body when a new Shopify order is placed. */
export function buildOrderPlacedWhatsAppDraft(params: {
  name?: string;
  order?: string;
}): string {
  const name = (params.name || "Customer").trim() || "Customer";
  const order = formatOrderLabel(params.order);

  return (
    `Assalamualaikum ${name},\n\n` +
    `Your Al Barakah Honey Order ${order} has been confirmed. It will be dispatched soon.\n\n` +
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

  return `${siteBaseUrl()}/wa?${qs.toString()}`;
}
