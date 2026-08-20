const TRACKING_BASE = "https://www.mulphilog.com/tracking/";

export type WhatsAppDraftType = "delivery_issue" | "order_placed";

function formatOrderLabel(order?: string): string {
  let value = (order || "").trim();
  if (value && !value.startsWith("#") && value.toLowerCase() !== "your order") {
    value = `#${value}`;
  }
  if (!value) return "your order";
  return value;
}

/**
 * Pre-filled WhatsApp body for failed / re-attempt delivery notices.
 * Built on the Next.js /wa redirect so emojis survive (Gmail mangles wa.me links).
 */
export function buildDeliveryIssueWhatsAppDraft(params: {
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
}): string {
  const name = (params.name || "Customer").trim() || "Customer";
  const order = formatOrderLabel(params.order);
  const status = (params.status || "").trim() || "Delivery update";
  const cn = (params.cn || "").trim();
  const trackingUrl = cn ? `${TRACKING_BASE}${cn}` : TRACKING_BASE;

  return (
    `Assalamualaikum ${name},\n\n` +
    `Your Al Barakah Honey Order ${order} could not be delivered on the first attempt.\n\n` +
    `📦 Delivery Status: ${status}\n` +
    `🚚 Tracking No.: ${cn || "—"}\n\n` +
    `📞 Please keep your mobile phone active and available for the courier's call. If the courier is unable to reach you, your parcel may be returned to us.\n\n` +
    `🔗 Track Your Shipment:\n` +
    `${trackingUrl}\n\n` +
    `Thank you for choosing Al Barakah Honey 🍯`
  );
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
  return buildDeliveryIssueWhatsAppDraft(params);
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
  // Never use Shopify STORE_URL — /wa must hit this Next.js app (tunnel or albarakahoney.com).
  const raw = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.albarakahoney.com"
  ).trim();
  // Support values like NEXT_PUBLIC_BASE_URL = "https://..." with spaces/quotes
  const fromEnv = raw.replace(/^["']|["']$/g, "");
  return fromEnv.replace(/\/+$/, "");
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
