const TRACKING_BASE = "https://www.mulphilog.com/tracking/";

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
  let order = (params.order || "").trim();
  if (order && !order.startsWith("#") && order.toLowerCase() !== "your order") {
    order = `#${order}`;
  }
  if (!order) order = "your order";

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
