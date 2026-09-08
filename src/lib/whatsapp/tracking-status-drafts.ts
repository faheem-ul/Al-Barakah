const GOOGLE_REVIEW_URL = "https://g.page/r/Cb5ju-Dzbs1nEBM/review";
const SUPPORT_PHONE = "0325-6957327";

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
  address?: string;
  total?: string;
};

function buildBookedDraft(params: {
  name: string;
  order: string;
  address: string;
  total: string;
}): string {
  const amount = params.total.replace(/^rs\.?\s*/i, "").trim();
  const receipt = [
    amount ? `💰 COD Amount: Rs. ${amount}` : "",
    params.address ? `📍 Delivery Address: ${params.address}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    `Hi ${params.name}! 👋\n\n` +
    `Your Al Barakah Honey order ${params.order} has been booked with M&P. 🍯📦\n\n` +
    (receipt ? `${receipt}\n\n` : "") +
    `Please check your delivery address and COD amount above.\n\n` +
    `✅ If everything is correct, please reply CONFIRM.\n` +
    `✏️ If there is any issue with your address, simply reply with the correct details.\n\n` +
    `Thank you for choosing Al Barakah Honey 💛\n` +
    `Pure Blessing in Every Drop 🍯`
  );
}

/** Status headline only — rest of the post-booking draft stays the same. */
function statusUpdateHeadline(
  key: Exclude<TrackingStatusKey, "booked">,
  order: string,
  rawStatus?: string,
): string {
  switch (key) {
    case "arrived_ops":
      return `Good news! Your Al Barakah Honey order ${order} has arrived at the M&P facility. 🍯📦`;
    case "in_transit":
      return `Good news! Your Al Barakah Honey order ${order} is now in transit with M&P. 🍯📦`;
    case "reached_destination":
      return `Good news! Your Al Barakah Honey order ${order} has reached your city. 📍🍯`;
    case "out_for_delivery":
      return `Good news! Your Al Barakah Honey order ${order} is out for delivery today! 🚚🎉`;
    case "delivered":
      return `Good news! Your Al Barakah Honey order ${order} has been successfully delivered. 🎉🍯`;
    case "unsuccessful":
      return `Your Al Barakah Honey order ${order} could not be delivered today. 📦`;
    case "hold_for_advice":
      return `Your Al Barakah Honey order ${order} is currently on hold with M&P. 📦`;
    case "reattempt":
      return `Good news! Your Al Barakah Honey order ${order} is scheduled for another delivery attempt. 🚚`;
    case "failed_delivered":
      return `Unfortunately, your Al Barakah Honey order ${order} could not be delivered by M&P. 📦`;
    case "return_in_transit":
      return `Your Al Barakah Honey order ${order} is being returned to us by M&P. 📦`;
    case "return_reached_origin":
      return `Your Al Barakah Honey order ${order} has reached origin during the return process. 📦`;
    case "return_out_for_delivery":
      return `Your Al Barakah Honey order ${order} is out for delivery back to us (return). 📦`;
    case "return_to_shipper":
      return `Your Al Barakah Honey order ${order} has been returned to us by M&P. 📦`;
    default: {
      const status = String(rawStatus || "")
        .replace(/\s+/g, " ")
        .trim();
      return status
        ? `Your Al Barakah Honey order ${order} status is now: ${status}. 🍯📦`
        : `Your Al Barakah Honey order ${order} has a tracking update. 🍯📦`;
    }
  }
}

/** Shared draft for every status after booking; only the status line changes. */
function buildTransitUpdateDraft(params: {
  name: string;
  order: string;
  address: string;
  total: string;
  cn: string;
  key: Exclude<TrackingStatusKey, "booked">;
  rawStatus?: string;
}): string {
  const amount = params.total.replace(/^rs\.?\s*/i, "").trim();
  const receipt = [
    amount ? `💰 COD Amount: Rs. ${amount}` : "",
    params.address ? `📍 Delivery Address: ${params.address}` : "",
    params.cn && params.cn !== "—"
      ? `🔎 Tracking Number: ${params.cn}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const headline = statusUpdateHeadline(
    params.key,
    params.order,
    params.rawStatus,
  );

  return (
    `Hi ${params.name}! 👋\n\n` +
    `${headline}\n\n` +
    `🚚 Your parcel is on its way to you!\n\n` +
    (receipt ? `${receipt}\n\n` : "") +
    `Please check your delivery address and COD amount above. If you notice any issue, simply reply to this message and let us know.\n\n` +
    `Thank you for choosing Al Barakah Honey 💛\n` +
    `Pure Blessing in Every Drop 🍯`
  );
}

/** Delivered draft — shared style + Google review link. */
function buildDeliveredDraft(params: {
  name: string;
  order: string;
  address: string;
  total: string;
  cn: string;
}): string {
  const amount = params.total.replace(/^rs\.?\s*/i, "").trim();
  const receipt = [
    amount ? `💰 COD Amount: Rs. ${amount}` : "",
    params.address ? `📍 Delivery Address: ${params.address}` : "",
    params.cn && params.cn !== "—"
      ? `🔎 Tracking Number: ${params.cn}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    `Hi ${params.name}! 👋\n\n` +
    `Good news! Your Al Barakah Honey order ${params.order} has been successfully delivered. 🎉🍯\n\n` +
    `We hope you enjoy your honey!\n\n` +
    (receipt ? `${receipt}\n\n` : "") +
    `Please leave us a quick review:\n` +
    `${GOOGLE_REVIEW_URL}\n\n` +
    `If you'd like to order more, just call or WhatsApp us and we'll book your order:\n` +
    `${SUPPORT_PHONE}\n\n` +
    `Thank you for choosing Al Barakah Honey 💛\n` +
    `Pure Blessing in Every Drop 🍯`
  );
}

/**
 * Per-status WhatsApp body for admin email button.
 * Source of truth: google-apps-script/mp-tracking/whatsapp-status-drafts.md
 *
 * Booked → CONFIRM draft.
 * Delivered → shared style + Google review link.
 * Every other status → shared layout with status-specific headline.
 */
export function buildTrackingStatusWhatsAppDraft(params: DraftParams): string {
  const name = (params.name || "Customer").trim() || "Customer";
  const order = formatOrderLabel(params.order);
  const cn = (params.cn || "").trim() || "—";
  const address = String(params.address || "")
    .replace(/\s+/g, " ")
    .trim();
  const total = String(params.total || "")
    .replace(/\s+/g, " ")
    .trim();
  const key = resolveTrackingStatusKey(params.status);

  if (key === "booked") {
    return buildBookedDraft({ name, order, address, total });
  }

  if (key === "delivered") {
    return buildDeliveredDraft({ name, order, address, total, cn });
  }

  return buildTransitUpdateDraft({
    name,
    order,
    address,
    total,
    cn,
    key,
    rawStatus: params.status,
  });
}
