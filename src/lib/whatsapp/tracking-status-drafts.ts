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

function cleanLine(value?: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Digits-only COD amount for WhatsApp (e.g. "Rs 2,099.00" → "2099"). */
export function formatCodAmount(raw?: string): string {
  const cleaned = cleanLine(raw);
  if (!cleaned) return "";

  const withoutCurrency = cleaned
    .replace(/^(rs\.?|pkr|pkr\.|rupees?)\s*/i, "")
    .replace(/\s*(rs\.?|pkr|pkr\.|rupees?)$/i, "")
    .trim();

  const match = withoutCurrency.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return withoutCurrency.replace(/^rs\.?\s*/i, "").trim();
  }

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return match[1];
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return String(n);
}

type DraftParams = {
  name?: string;
  order?: string;
  status?: string;
  cn?: string;
  address?: string;
  total?: string;
  /** M&P Tracking Detail (reason) from the sheet / admin email */
  detail?: string;
};

function cleanTrackingReason(raw?: string): string {
  const cleaned = cleanLine(raw);
  if (!cleaned) return "";
  if (/^ERROR:/i.test(cleaned)) return "";
  if (/could not parse/i.test(cleaned)) return "";
  return cleaned;
}

function shouldIncludeTrackingReason(
  key: Exclude<TrackingStatusKey, "booked" | "delivered">,
): boolean {
  return (
    key === "unsuccessful" ||
    key === "hold_for_advice" ||
    key === "failed_delivered"
  );
}

function buildBookedDraft(params: {
  name: string;
  order: string;
  address: string;
  total: string;
}): string {
  const amount = formatCodAmount(params.total);
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

/** Status headline — customer-friendly line for each M&P status. */
function statusUpdateHeadline(
  key: Exclude<TrackingStatusKey, "booked">,
  order: string,
  rawStatus?: string,
): string {
  switch (key) {
    case "arrived_ops":
      return `Good news! Your Al Barakah Honey order ${order} has arrived at the M&P hub facility. 🍯📦`;
    case "in_transit":
      return `Good news! Your Al Barakah Honey order ${order} is now in transit with M&P. 🍯📦`;
    case "reached_destination":
      return `Good news! Your Al Barakah Honey order ${order} has reached your city and is ready for delivery. 📍🍯`;
    case "out_for_delivery":
      return `Good news! Your Al Barakah Honey order ${order} is out for delivery today! 🚚🎉`;
    case "delivered":
      return `Good news! Your Al Barakah Honey order ${order} has been successfully delivered. 🎉🍯`;
    case "unsuccessful":
      return `M&P tried to deliver your Al Barakah Honey order ${order}, but the delivery attempt was unsuccessful. 📦`;
    case "hold_for_advice":
      return `Your Al Barakah Honey order ${order} is on hold with M&P while they wait for further instructions. ⏸️📦`;
    case "reattempt":
      return `Good news! M&P has scheduled another delivery attempt for your Al Barakah Honey order ${order}. 🚚`;
    case "failed_delivered":
      return `Unfortunately, delivery of your Al Barakah Honey order ${order} could not be completed and the parcel may be returned. 📦`;
    case "return_in_transit":
      return `Your Al Barakah Honey order ${order} is on its way back to us (return in transit). 📦`;
    case "return_reached_origin":
      return `Your Al Barakah Honey order ${order} has reached the origin city during return. 📦`;
    case "return_out_for_delivery":
      return `Your Al Barakah Honey order ${order} is out for delivery back to us as a return. 📦`;
    case "return_to_shipper":
      return `Your Al Barakah Honey order ${order} has been returned to us by M&P. 📦`;
    default: {
      const status = String(rawStatus || "")
        .replace(/\s+/g, " ")
        .trim();
      return status
        ? `Your Al Barakah Honey order ${order} status update: ${status}. 🍯📦`
        : `Your Al Barakah Honey order ${order} has a tracking update. 🍯📦`;
    }
  }
}

/**
 * Second line under the headline — must match the status tone
 * (never say "on its way" for failed / hold / return).
 */
function statusUpdateSupportLine(
  key: Exclude<TrackingStatusKey, "booked" | "delivered">,
): string {
  switch (key) {
    case "arrived_ops":
      return `🏭 Your parcel is at the M&P facility and being prepared for the next move.`;
    case "in_transit":
      return `🚚 Your parcel is on its way to you!`;
    case "reached_destination":
      return `📍 It is in your city and will move toward final delivery soon.`;
    case "out_for_delivery":
      return `📞 Please keep your phone available so someone can receive the parcel.`;
    case "unsuccessful":
      return `🙏 Please reply here if you were unavailable, or if your address needs an update — we'll help get it re-attempted.`;
    case "hold_for_advice":
      return `✍️ Please reply to this message with your guidance so we can help M&P deliver your parcel.`;
    case "reattempt":
      return `📞 Please keep your phone available and make sure someone can receive the parcel.`;
    case "failed_delivered":
      return `💬 If you still want this order, reply here and we'll help with the next step.`;
    case "return_in_transit":
      return `💬 If you still want to receive your order, reply here and we'll assist you.`;
    case "return_reached_origin":
      return `💬 Reply here if you'd still like us to arrange delivery for you.`;
    case "return_out_for_delivery":
      return `💬 Reply here if you still want your order and we'll help you.`;
    case "return_to_shipper":
      return `💬 Reply "YES" if you'd still like to receive your honey and we'll help with the next step.`;
    default:
      return `ℹ️ Please check the details below and reply if anything looks wrong.`;
  }
}

/** Shared draft for every status after booking; headline + support line match status. */
function buildTransitUpdateDraft(params: {
  name: string;
  order: string;
  address: string;
  total: string;
  cn: string;
  key: Exclude<TrackingStatusKey, "booked" | "delivered">;
  rawStatus?: string;
  detail?: string;
}): string {
  const amount = formatCodAmount(params.total);
  const reason =
    shouldIncludeTrackingReason(params.key) && params.detail
      ? cleanTrackingReason(params.detail)
      : "";
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
  const support = statusUpdateSupportLine(params.key);

  return (
    `Hi ${params.name}! 👋\n\n` +
    `${headline}\n\n` +
    (reason ? `📝 Reason: ${reason}\n\n` : "") +
    `${support}\n\n` +
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
  const amount = formatCodAmount(params.total);
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
  const detail = cleanTrackingReason(params.detail);
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
    detail,
  });
}
