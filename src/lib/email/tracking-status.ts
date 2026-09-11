/**
 * Tracking status emails — HTML/text match Apps Script
 * (sendTrackingStatusEmail_ / sendCustomerTrackingEmail_).
 */
import {
  brandedCtaButtonHtml,
  brandedDetailRowHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { adminNotifyEmail, sendAdminEmail } from "@/lib/email/send";
import {
  buildWhatsAppSiteLink,
  normalizeWhatsAppPhone,
  siteBaseUrl,
} from "@/lib/whatsapp/delivery-issue-draft";

const TRACKING_BASE = "https://www.mulphilog.com/tracking/";

export type TrackingStatusEmailInput = {
  cn: string;
  status: string;
  location?: string;
  detail?: string;
  /** M&P previous status from API (admin email). */
  mpPreviousStatus?: string;
  /** Sheet previous Order Status (customer email wording). */
  previousStatus?: string;
  orderNumber?: string;
  customerName?: string;
  contactNumber?: string;
  /** Customer inbox; if blank, caller should resolve first. */
  customerEmail?: string;
  additionalNote?: string;
  address?: string;
  city?: string;
  totalAmount?: string;
  checkedAt?: string;
};

function displayOrder(orderNumber?: string, fallback?: string): string {
  const raw = String(orderNumber || fallback || "").trim();
  if (!raw) return "—";
  return raw.indexOf("#") === 0 ? raw : `#${raw}`;
}

function brandUrls() {
  const siteUrl = siteBaseUrl();
  return {
    siteUrl,
    logoUrl: process.env.EMAIL_LOGO_URL?.trim() || `${siteUrl}/logo.png`,
    reviewUrl:
      process.env.GOOGLE_REVIEW_URL?.trim() ||
      "https://g.page/r/Cb5ju-Dzbs1nEBM/review",
    reviewQrUrl:
      process.env.REVIEW_QR_URL?.trim() ||
      `${siteUrl}/google-review-qr.png`,
    supportPhone:
      process.env.SUPPORT_PHONE?.trim() || "+92 325 6957327",
    supportTel:
      process.env.SUPPORT_PHONE_TEL?.trim() || "+923062141972",
  };
}

function formatCheckedAt(value?: string): string {
  if (value && String(value).trim()) return String(value).trim();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function isDeliveredStatus(status: string): boolean {
  return String(status || "")
    .trim()
    .toLowerCase()
    .includes("delivered");
}

function shipAddress(address?: string, city?: string): string {
  return [address, city].map((p) => String(p || "").trim()).filter(Boolean).join(", ");
}

/** Admin ops email — same content as Apps Script sendTrackingStatusEmail_. */
export function buildAdminTrackingStatusEmail(input: TrackingStatusEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const b = EMAIL_BRAND;
  const { siteUrl, logoUrl, supportPhone, supportTel } = brandUrls();
  const cn = String(input.cn || "").trim();
  const status = String(input.status || "").trim();
  const location = String(input.location || "").trim();
  const detail = String(input.detail || "").trim();
  const mpPrevious = String(input.mpPreviousStatus || "").trim();
  const customerName = String(input.customerName || "").trim() || "Customer";
  const contactNumber = String(input.contactNumber || "").trim();
  const additionalNote = String(input.additionalNote || "").trim();
  const orderLabel = displayOrder(input.orderNumber);
  const trackingUrl = TRACKING_BASE + cn;
  const checkedAt = formatCheckedAt(input.checkedAt);
  const delivered = isDeliveredStatus(status);
  const statusLower = status.toLowerCase();

  const badgeBg =
    delivered
      ? b.mint
      : statusLower.includes("return") || statusLower.includes("fail")
        ? "#b42318"
        : b.brown;
  const badgeColor = delivered ? b.ink : b.white;

  const waPhone = normalizeWhatsAppPhone(contactNumber);
  const waLink = waPhone
    ? buildWhatsAppSiteLink({
        type: "tracking",
        phone: waPhone,
        name: customerName,
        order: orderLabel === "—" ? "" : orderLabel,
        status,
        cn,
        address: shipAddress(input.address, input.city),
        total: input.totalAmount,
        detail,
      })
    : null;

  const subject = `Tracking update: ${customerName} — CN ${cn} is now "${status}"`;

  const introHtml =
    "An M&amp;P shipment status has changed" +
    (mpPrevious
      ? ` from <strong>${escapeEmailHtml(mpPrevious)}</strong> to <strong>${escapeEmailHtml(status)}</strong>.`
      : ` to <strong>${escapeEmailHtml(status)}</strong>.`);

  const waCtaHtml = waLink
    ? brandedCtaButtonHtml({
        href: waLink,
        label: "Send WhatsApp update to customer",
        background: "#25D366",
        color: "#ffffff",
      }) +
      `<p style="margin:0 0 8px;color:${b.muted};font-size:12px;text-align:center;">Opens WhatsApp with a ready message. Tap <strong>Send</strong> to deliver it.</p>`
    : `<p style="margin:0 0 8px;color:#b42318;font-size:13px;text-align:center;">No valid Contact phone — WhatsApp button skipped.</p>`;

  const rows =
    brandedDetailRowHtml("Customer", escapeEmailHtml(customerName)) +
    brandedDetailRowHtml("Contact", escapeEmailHtml(contactNumber || "—")) +
    brandedDetailRowHtml(
      "Order number",
      `<strong>${escapeEmailHtml(orderLabel)}</strong>`,
    ) +
    brandedDetailRowHtml(
      "Tracking number",
      `<strong style="letter-spacing:0.04em;">${escapeEmailHtml(cn)}</strong>`,
    ) +
    brandedDetailRowHtml(
      "Previous status",
      escapeEmailHtml(mpPrevious || "(none)"),
    ) +
    brandedDetailRowHtml(
      "Current status",
      `<strong style="color:${b.brown};">${escapeEmailHtml(status)}</strong>`,
    ) +
    brandedDetailRowHtml("Location", escapeEmailHtml(location || "—")) +
    brandedDetailRowHtml("Tracking Detail", escapeEmailHtml(detail || "—")) +
    brandedDetailRowHtml(
      "Additional Note",
      escapeEmailHtml(additionalNote || "—"),
    ) +
    brandedDetailRowHtml("Checked at", escapeEmailHtml(checkedAt));

  const html =
    `<div style="margin:0;padding:0;background:${b.page};">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${b.page};padding:28px 12px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:${b.white};border-radius:14px;overflow:hidden;border:1px solid ${b.border};">` +
    `<tr><td style="padding:28px 28px 18px;text-align:center;background:${b.cream};border-bottom:1px solid ${b.border};">` +
    `<img src="${escapeEmailHtml(logoUrl)}" alt="Al Barakah Honey" width="148" style="display:block;margin:0 auto 10px;width:148px;max-width:60%;height:auto;border:0;" />` +
    `<div style="margin-top:8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${b.muted};font-family:Arial,sans-serif;font-weight:600;">Shipment status update</div>` +
    `</td></tr>` +
    `<tr><td style="padding:26px 28px 8px;font-family:Arial,sans-serif;color:${b.ink};font-size:15px;line-height:1.65;">` +
    `<p style="margin:0 0 14px;font-size:16px;">Assalamualaikum,</p>` +
    `<p style="margin:0 0 20px;color:${b.ink};">${introHtml}</p>` +
    `<div style="margin:0 0 18px;text-align:center;">` +
    `<span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:13px;font-weight:700;letter-spacing:0.04em;padding:8px 16px;border-radius:999px;">${escapeEmailHtml(status)}</span></div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;font-size:14px;border:1px solid ${b.border};border-radius:10px;overflow:hidden;">${rows}</table>` +
    waCtaHtml +
    `<p style="margin:12px 0 8px;font-size:12px;color:${b.muted};text-align:center;">Track anytime:<br><a href="${escapeEmailHtml(trackingUrl)}" style="color:${b.brown};word-break:break-all;">${escapeEmailHtml(trackingUrl)}</a></p>` +
    `</td></tr>` +
    `<tr><td style="padding:20px 28px 28px;background:${b.cream};border-top:1px solid ${b.border};font-family:Arial,sans-serif;font-size:13px;color:${b.muted};line-height:1.55;">` +
    `<div style="margin:0 0 12px;padding:14px 16px;background:${b.white};border:1px solid ${b.border};border-radius:8px;">` +
    `<strong style="color:${b.brown};">Need help?</strong><br>` +
    `Support: <a href="tel:${escapeEmailHtml(supportTel)}" style="color:${b.brown};font-weight:700;text-decoration:none;">${escapeEmailHtml(supportPhone)}</a></div>` +
    `Al Barakah Honey — automated tracking notice for the ops team.<br><br>` +
    `Warm regards,<br><strong style="color:${b.brown};">Al Barakah Honey</strong><br>` +
    `<a href="${escapeEmailHtml(siteUrl)}" style="color:${b.muted};font-size:12px;">${escapeEmailHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>` +
    `</td></tr>` +
    `</table></td></tr></table></div>`;

  const waBlockPlain = waLink
    ? `\nSend WhatsApp update to customer:\n${waLink}\n`
    : "";

  const text =
    `Assalamualaikum,\n\n` +
    `M&P shipment status changed.\n\n` +
    `Customer: ${customerName}\n` +
    `Contact: ${contactNumber || "—"}\n` +
    `Order Number: ${input.orderNumber || "—"}\n` +
    `Tracking / CN: ${cn}\n` +
    `Previous status: ${mpPrevious || "(none)"}\n` +
    `Current status: ${status}\n` +
    `Location: ${location || "—"}\n` +
    `Tracking Detail: ${detail || "—"}\n` +
    `Additional Note: ${additionalNote || "—"}\n` +
    `Checked at: ${checkedAt}\n` +
    waBlockPlain +
    `Track: ${trackingUrl}\n`;

  return { subject, html, text };
}

/** Customer tracking email — Delivered template matches Apps Script. */
export function buildCustomerTrackingStatusEmail(
  input: TrackingStatusEmailInput & { customerEmail: string },
): { to: string; subject: string; html: string; text: string } {
  const b = EMAIL_BRAND;
  const {
    siteUrl,
    logoUrl,
    reviewUrl,
    reviewQrUrl,
    supportPhone,
    supportTel,
  } = brandUrls();
  const cn = String(input.cn || "").trim();
  const status = String(input.status || "").trim();
  const location = String(input.location || "").trim();
  const detail = String(input.detail || "").trim();
  const previousStatus = String(input.previousStatus || "").trim();
  const customerName = String(input.customerName || "").trim() || "Customer";
  const orderLabel = displayOrder(input.orderNumber);
  const trackingUrl = TRACKING_BASE + cn;
  const checkedAt = formatCheckedAt(input.checkedAt);
  const delivered = isDeliveredStatus(status);
  const prevNorm = previousStatus.toLowerCase();
  const isInitial = !prevNorm || prevNorm === "pending";

  const subject = delivered
    ? `Order ${orderLabel} delivered — thank you! Please leave a review`
    : isInitial
      ? `Order ${orderLabel} shipped — tracking ${cn} (${status})`
      : `Order ${orderLabel} update — now ${status}`;

  const eyebrow = delivered
    ? "Successfully delivered"
    : isInitial
      ? "Your shipment is on the way"
      : "Shipment status update";

  let introHtml: string;
  let introPlain: string;
  if (delivered) {
    introHtml =
      'Great news — your Al Barakah Honey order has been <strong style="color:#1f5c3a;">delivered</strong>. ' +
      "We hope every spoon tastes like a blessing. If you loved it, a short Google review would mean the world to us.";
    introPlain =
      "Great news — your Al Barakah Honey order has been delivered. " +
      "We hope every spoon tastes like a blessing. If you loved it, a short Google review would mean the world to us.";
  } else if (isInitial) {
    introHtml =
      "Thank you for choosing Al Barakah Honey. Your order has been shipped with M&amp;P. " +
      "Please save your tracking number below so you can follow the delivery.";
    introPlain =
      "Thank you for choosing Al Barakah Honey. Your order has been shipped with M&P. " +
      "Please save your tracking number below so you can follow the delivery.";
  } else {
    introHtml =
      "Your Al Barakah Honey shipment status has changed" +
      (previousStatus
        ? ` from <strong>${escapeEmailHtml(previousStatus)}</strong> to <strong style="color:#1f5c3a;">${escapeEmailHtml(status)}</strong>.`
        : ` to <strong style="color:#1f5c3a;">${escapeEmailHtml(status)}</strong>.`);
    introPlain =
      "Your Al Barakah Honey shipment status has changed" +
      (previousStatus
        ? ` from "${previousStatus}" to "${status}".`
        : ` to "${status}".`);
  }

  const footerNote = delivered
    ? "Thank you for shopping with Al Barakah Honey. "
    : isInitial
      ? "You will receive another email whenever the courier status changes. "
      : "This message was sent because the courier status for your order changed. ";

  if (delivered) {
    introHtml = introHtml.replace(/#1f5c3a/g, b.mint);
  } else if (!isInitial) {
    introHtml = introHtml.replace(/#1f5c3a/g, b.brown);
  }

  const statusBadgeColor = delivered
    ? b.mint
    : status.toLowerCase().includes("return")
      ? "#b42318"
      : b.brown;

  const generatedQrUrl = reviewUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(reviewUrl)}`
    : "";
  const reviewQrSrc = reviewQrUrl || generatedQrUrl;

  let reviewBlockHtml = "";
  let reviewBlockPlain = "";
  if (delivered && reviewUrl) {
    const qrImgHtml = reviewQrSrc
      ? `<img src="${escapeEmailHtml(reviewQrSrc)}" alt="Scan to leave a Google review" width="160" height="160" style="display:block;margin:0 auto;width:160px;height:160px;border:0;" />`
      : "";

    reviewBlockHtml =
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;background:${b.cream};border:1px solid ${b.border};border-radius:10px;">` +
      `<tr><td style="padding:22px 20px;text-align:center;font-family:Arial,sans-serif;">` +
      `<div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${b.muted};font-weight:700;margin-bottom:8px;">Share your experience</div>` +
      `<div style="font-size:18px;color:${b.brown};font-weight:700;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;">Would you leave us a Google review?</div>` +
      `<p style="margin:0 0 20px;font-size:14px;color:${b.muted};line-height:1.55;">Your feedback helps more families find pure honey — and it only takes a minute.</p>` +
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;"><tr><td align="center" style="border-radius:30px;background:${b.brown};">` +
      `<a href="${escapeEmailHtml(reviewUrl)}" style="display:inline-block;background:${b.brown};color:${b.white};text-decoration:none;padding:14px 28px;font-size:14px;font-weight:600;border-radius:30px;line-height:1.2;">Leave a Google review</a>` +
      `</td></tr></table>` +
      (qrImgHtml
        ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 8px;"><tr><td align="center" style="padding:14px;background:${b.white};border:1px solid ${b.border};border-radius:12px;">${qrImgHtml}</td></tr></table>` +
          `<p style="margin:12px 0 0;font-size:12px;color:${b.muted};">Or scan this code with your phone camera</p>`
        : "") +
      `</td></tr></table>`;
    reviewBlockPlain =
      `\nWould you leave us a Google review?\n${reviewUrl}\n(Or scan the QR code in the HTML email.)\n`;
  }

  const primaryCtaHtml = delivered
    ? ""
    : `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 18px;"><tr><td align="center" style="border-radius:30px;background:${b.brown};">` +
      `<a href="${escapeEmailHtml(trackingUrl)}" style="display:inline-block;background:${b.brown};color:${b.white};text-decoration:none;padding:14px 28px;font-size:14px;font-weight:600;border-radius:30px;">Track your shipment</a>` +
      `</td></tr></table>`;

  const rows =
    brandedDetailRowHtml("Order number", escapeEmailHtml(orderLabel)) +
    brandedDetailRowHtml(
      "Tracking number",
      `<strong style="letter-spacing:0.04em;">${escapeEmailHtml(cn)}</strong>`,
    ) +
    brandedDetailRowHtml(
      "Current status",
      `<strong style="color:${b.brown};">${escapeEmailHtml(status)}</strong>`,
    ) +
    brandedDetailRowHtml("Location", escapeEmailHtml(location || "—")) +
    brandedDetailRowHtml("Detail", escapeEmailHtml(detail || "—")) +
    brandedDetailRowHtml("Updated", escapeEmailHtml(checkedAt));

  const html =
    `<div style="margin:0;padding:0;background:${b.page};">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${b.page};padding:28px 12px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:${b.white};border-radius:14px;overflow:hidden;border:1px solid ${b.border};">` +
    `<tr><td style="padding:28px 28px 18px;text-align:center;background:${b.cream};border-bottom:1px solid ${b.border};">` +
    `<img src="${escapeEmailHtml(logoUrl)}" alt="Al Barakah Honey" width="148" style="display:block;margin:0 auto 10px;width:148px;max-width:60%;height:auto;border:0;" />` +
    `<div style="margin-top:8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${b.muted};font-family:Arial,sans-serif;font-weight:600;">${escapeEmailHtml(eyebrow)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:26px 28px 8px;font-family:Arial,sans-serif;color:${b.ink};font-size:15px;line-height:1.65;">` +
    `<p style="margin:0 0 14px;font-size:16px;">Assalamualaikum` +
    (customerName && customerName !== "Customer"
      ? `, <strong>${escapeEmailHtml(customerName)}</strong>`
      : "") +
    `,</p>` +
    `<p style="margin:0 0 20px;color:${b.ink};">${introHtml}</p>` +
    `<div style="margin:0 0 18px;text-align:center;">` +
    `<span style="display:inline-block;background:${statusBadgeColor};color:${delivered ? b.ink : b.white};font-size:13px;font-weight:700;letter-spacing:0.04em;padding:8px 16px;border-radius:999px;">${escapeEmailHtml(status)}</span></div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;font-size:14px;border:1px solid ${b.border};border-radius:10px;overflow:hidden;">${rows}</table>` +
    primaryCtaHtml +
    reviewBlockHtml +
    (!delivered
      ? `<p style="margin:0 0 8px;font-size:12px;color:${b.muted};text-align:center;">Track anytime:<br><a href="${escapeEmailHtml(trackingUrl)}" style="color:${b.brown};word-break:break-all;">${escapeEmailHtml(trackingUrl)}</a></p>`
      : "") +
    `</td></tr>` +
    `<tr><td style="padding:20px 28px 28px;background:${b.cream};border-top:1px solid ${b.border};font-family:Arial,sans-serif;font-size:13px;color:${b.muted};line-height:1.55;">` +
    `<div style="margin:0 0 12px;padding:14px 16px;background:${b.white};border:1px solid ${b.border};border-radius:8px;">` +
    `<strong style="color:${b.brown};">Need help?</strong><br>` +
    `If you have any questions, call or WhatsApp us at <a href="tel:${escapeEmailHtml(supportTel)}" style="color:${b.brown};font-weight:700;text-decoration:none;">${escapeEmailHtml(supportPhone)}</a></div>` +
    `${escapeEmailHtml(footerNote)}If you did not place this order, reply to this email and we will help immediately.<br><br>` +
    `Warm regards,<br><strong style="color:${b.brown};">Al Barakah Honey</strong><br>` +
    `<a href="${escapeEmailHtml(siteUrl)}" style="color:${b.muted};font-size:12px;">${escapeEmailHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>` +
    `</td></tr>` +
    `</table></td></tr></table></div>`;

  const text =
    `Assalamualaikum` +
    (customerName && customerName !== "Customer" ? `, ${customerName}` : "") +
    `,\n\n` +
    introPlain +
    `\n\n` +
    `Order number: ${orderLabel}\n` +
    `Tracking number: ${cn}\n` +
    `Current status: ${status}\n` +
    `Location: ${location || "—"}\n` +
    `Detail: ${detail || "—"}\n` +
    `Updated: ${checkedAt}\n` +
    (!delivered ? `\nTrack your shipment: ${trackingUrl}\n` : "") +
    reviewBlockPlain +
    `\nNeed help?\nIf you have any questions, call or WhatsApp us at ${supportPhone}\n\nWarm regards,\nAl Barakah Honey\n`;

  return {
    to: input.customerEmail,
    subject,
    html,
    text,
  };
}

export async function sendDeliveredTrackingEmails(
  input: TrackingStatusEmailInput,
): Promise<{
  ok: boolean;
  admin: { sent: boolean; skipped?: boolean };
  customer: { sent: boolean; skipped?: boolean; reason?: string };
}> {
  const adminTo = adminNotifyEmail();
  const adminMail = buildAdminTrackingStatusEmail(input);
  const admin = await sendAdminEmail({
    to: adminTo,
    subject: adminMail.subject,
    html: adminMail.html,
    text: adminMail.text,
  });

  let customerEmail = String(input.customerEmail || "")
    .trim()
    .toLowerCase();
  if (!customerEmail || !customerEmail.includes("@")) {
    return {
      ok: admin.sent,
      admin,
      customer: {
        sent: false,
        skipped: true,
        reason: "missing_customer_email",
      },
    };
  }

  const customerMail = buildCustomerTrackingStatusEmail({
    ...input,
    customerEmail,
  });
  const customer = await sendAdminEmail({
    to: customerMail.to,
    subject: customerMail.subject,
    html: customerMail.html,
    text: customerMail.text,
    replyTo: adminNotifyEmail(),
  });

  return {
    ok: Boolean(admin.sent && customer.sent),
    admin,
    customer,
  };
}
