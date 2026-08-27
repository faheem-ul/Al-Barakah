const TRACKING_BASE = "https://www.mulphilog.com/tracking/";
const GOOGLE_REVIEW_URL = "https://g.page/r/Cb5ju-Dzbs1nEBM/review";
const SUPPORT_PHONE = "0325-6957327";
const MP_HELPLINE = "042-111-202-202";

export type TrackingStatusKey =
  | "booked"
  | "arrived_ops"
  | "in_transit"
  | "reached_destination"
  | "out_for_delivery"
  | "delivered"
  | "unsuccessful"
  | "hold_for_advice"
  | "reattempt"
  | "failed_delivered"
  | "return_in_transit"
  | "return_reached_origin"
  | "return_out_for_delivery"
  | "return_to_shipper"
  | "generic";

function formatOrderLabel(order?: string): string {
  let value = (order || "").trim();
  if (value && !value.startsWith("#") && value.toLowerCase() !== "your order") {
    value = `#${value}`;
  }
  if (!value) return "your order";
  return value;
}

function trackingUrl(cn?: string): string {
  const cleaned = (cn || "").trim();
  return cleaned ? `${TRACKING_BASE}${cleaned}` : TRACKING_BASE;
}

function sharedFooter(cn?: string): string {
  return (
    `🔎 Want to track your parcel?\n` +
    `You can check the latest tracking updates on the M&P tracking page.\n` +
    `${trackingUrl(cn)}\n\n` +
    `📞 For M&P Delivery Updates:\n` +
    `You can contact the M&P Helpline at ${MP_HELPLINE} for the latest update regarding your shipment.\n\n` +
    `📞 Need further assistance?\n` +
    `If you need any help regarding your order, please contact Al Barakah Honey:\n` +
    `${SUPPORT_PHONE}\n\n` +
    `Thank you for choosing Al Barakah Honey. ❤️`
  );
}

function normalizeStatus(status?: string): string {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

/** Map M&P Order Status text → draft key. */
export function resolveTrackingStatusKey(status?: string): TrackingStatusKey {
  const n = normalizeStatus(status);
  if (!n) return "generic";

  if (n === "booked" || n.startsWith("booked")) return "booked";

  if (
    n.includes("arrived at ops") ||
    n.includes("ops facility") ||
    n.includes("arrived at m&p")
  ) {
    return "arrived_ops";
  }

  if (
    n.includes("out for delivery") &&
    (n.includes("return") || n.startsWith("return"))
  ) {
    return "return_out_for_delivery";
  }

  if (n.includes("out for delivery") || n.includes("out-for-delivery")) {
    return "out_for_delivery";
  }

  if (n.includes("reached at destination") || n.includes("reached destination")) {
    return "reached_destination";
  }

  if (n === "in-transit" || n === "in transit" || n.startsWith("in-transit")) {
    return "in_transit";
  }

  if (n === "delivered" || n === "deliverd") return "delivered";

  if (n.includes("unsuccessful")) return "unsuccessful";
  if (n.includes("hold for advice")) return "hold_for_advice";
  if (n.includes("re-attempt") || n.includes("reattempt")) return "reattempt";
  if (n.includes("failed deliver")) return "failed_delivered";

  if (
    n.includes("return to vendor") ||
    n.includes("return to shipper") ||
    n.includes("return to shipper")
  ) {
    return "return_to_shipper";
  }

  if (
    n.includes("return") &&
    (n.includes("reached at origin") || n.includes("reached origin"))
  ) {
    return "return_reached_origin";
  }

  if (n.includes("return") && n.includes("in transit")) {
    return "return_in_transit";
  }

  if (n.startsWith("return")) return "return_to_shipper";

  return "generic";
}

type DraftParams = {
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
};

/**
 * Per-status WhatsApp body for admin email button.
 * Source of truth: google-apps-script/mp-tracking/whatsapp-status-drafts.md
 */
export function buildTrackingStatusWhatsAppDraft(params: DraftParams): string {
  const name = (params.name || "Customer").trim() || "Customer";
  const order = formatOrderLabel(params.order);
  const cn = (params.cn || "").trim() || "—";
  const key = resolveTrackingStatusKey(params.status);
  const footer = sharedFooter(params.cn);

  let body = "";
  switch (key) {
    case "booked":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your Al Barakah Honey order ${order} has been booked with M&P.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `We'll keep you updated throughout the delivery.\n\n`;
      break;
    case "arrived_ops":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} has reached the M&P facility and is now being processed for transit.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `Your parcel is moving towards you!\n\n`;
      break;
    case "in_transit":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Good news! Your order ${order} is now on its way. 🚚\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `We'll update you when it reaches your city.\n\n`;
      break;
    case "reached_destination":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} has reached your city. 📍\n\n` +
        `It will now move towards final delivery.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `Please keep your phone available.\n\n`;
      break;
    case "out_for_delivery":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your Al Barakah Honey order ${order} is out for delivery today! 🚚🎉\n\n` +
        `Please keep your phone available and make sure someone is present to receive the parcel.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `Hope you enjoy every drop! 🍯\n\n`;
      break;
    case "delivered":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your Al Barakah Honey order ${order} has been successfully delivered. 🎉\n\n` +
        `We hope you enjoy your honey!\n\n` +
        `Please leave us a quick review:\n` +
        `${GOOGLE_REVIEW_URL}\n\n`;
      break;
    case "unsuccessful":
      body =
        `Hi ${name}! 🍯\n\n` +
        `M&P was unable to deliver your order ${order} today.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `They may attempt delivery again on the next working day.\n\n` +
        `If there's any issue with your address or availability, please let us know. We're here to help.\n\n`;
      break;
    case "hold_for_advice":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} is currently on hold with M&P after an unsuccessful delivery attempt.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `Please reply to this message so we can help resolve the issue and get your parcel delivered.\n\n` +
        `Al Barakah Honey Support\n\n`;
      break;
    case "reattempt":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Good news! M&P has scheduled another delivery attempt for your order ${order}. 🚚\n\n` +
        `Please keep your phone available and make sure someone is available to receive the parcel.\n\n` +
        `📦 Tracking: ${cn}\n\n`;
      break;
    case "failed_delivered":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Unfortunately, M&P could not complete the delivery of your order ${order}.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `The parcel may now be returned to us.\n\n` +
        `If you still want to receive your order, please reply to this message so we can help you.\n\n`;
      break;
    case "return_in_transit":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} is currently being returned to us by M&P.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `If you still want to receive your order, please reply here and we'll help you with the next step.\n\n`;
      break;
    case "return_reached_origin":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} has reached the origin location during the return process.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `If you'd still like to receive your order, please reply here so we can assist you.\n\n`;
      break;
    case "return_out_for_delivery":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your parcel ${order} is now out for delivery back to us as part of the return process.\n\n` +
        `📦 Tracking: ${cn}\n\n` +
        `If you still want your order, please reply to this message and we'll help you.\n\n`;
      break;
    case "return_to_shipper":
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your order ${order} has been returned to us by M&P.\n\n` +
        `We're sorry we couldn't get it delivered to you this time.\n\n` +
        `If you'd still like to receive your honey, just reply "YES" and we'll help you with the next step.\n\n` +
        `Al Barakah Honey\n\n`;
      break;
    default: {
      const status = (params.status || "").trim() || "Delivery update";
      body =
        `Hi ${name}! 🍯\n\n` +
        `Your Al Barakah Honey order ${order} has a tracking update.\n\n` +
        `📦 Delivery Status: ${status}\n` +
        `📦 Tracking: ${cn}\n\n`;
      break;
    }
  }

  return body + footer;
}
