import { getOrderCodAmount, money } from "@/lib/sales/calculations";
import type { SalesOrder } from "@/lib/sales/types";

import { sendAdminEmail } from "./send";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatBookingDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;

  const monthLabel = MONTHS[month - 1] ?? String(month);
  return `${String(day).padStart(2, "0")}-${monthLabel}-${year}`;
}

export function mpComplaintRecipients(): string[] {
  const fromEnv = process.env.MNP_COMPLAINT_TO_EMAIL?.trim();
  if (!fromEnv) return [];

  return fromEnv
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function buildMpComplaintEmail(order: SalesOrder): {
  subject: string;
  text: string;
  html: string;
} {
  const codAmount = money(getOrderCodAmount(order.calculation));
  const bookingDate = formatBookingDate(order.date);
  const consignmentNumber = String(order.consignmentNumber ?? "").trim();

  const subject = `Urgent M&P Complaint — Order ${order.orderNumber}`;

  const text =
    "Dear M&P Support Team,\n\n" +
    "I am writing to raise an urgent complaint regarding the following shipment:\n\n" +
    `Order ID: ${order.orderNumber}\n` +
    `Consignee: ${order.buyerName}\n` +
    `Consignment No.: ${consignmentNumber}\n` +
    `COD Amount: ${codAmount}\n` +
    `Booking Date: ${bookingDate}\n\n` +
    "The shipment is delayed and has not been delivered within the expected timeframe. " +
    "I have complained multiple times regarding delayed shipments, but unfortunately, " +
    "I have not received any proper response.\n\n" +
    "Kindly take immediate action, escalate this issue, and arrange delivery of the parcel as soon as possible.\n\n" +
    "Regards,\n" +
    "Adil\n" +
    "Al Baraka Honey";

  const html =
    "<p>Dear M&amp;P Support Team,</p>" +
    "<p>I am writing to raise an urgent complaint regarding the following shipment:</p>" +
    "<p>" +
    `<strong>Order ID:</strong> ${escapeHtml(order.orderNumber)}<br>` +
    `<strong>Consignee:</strong> ${escapeHtml(order.buyerName)}<br>` +
    `<strong>Consignment No.:</strong> ${escapeHtml(consignmentNumber)}<br>` +
    `<strong>COD Amount:</strong> ${escapeHtml(codAmount)}<br>` +
    `<strong>Booking Date:</strong> ${escapeHtml(bookingDate)}` +
    "</p>" +
    "<p>The shipment is delayed and has not been delivered within the expected timeframe. " +
    "I have complained multiple times regarding delayed shipments, but unfortunately, " +
    "I have not received any proper response.</p>" +
    "<p>Kindly take immediate action, escalate this issue, and arrange delivery of the parcel as soon as possible.</p>" +
    "<p>Regards,<br>Adil<br>Al Baraka Honey</p>";

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMpComplaintEmail(
  order: SalesOrder,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const recipients = mpComplaintRecipients();
  if (!recipients.length) {
    return {
      sent: false,
      skipped: true,
      error:
        "M&P complaint recipient email is empty.",
    };
  }

  const { subject, text, html } = buildMpComplaintEmail(order);
  const result = await sendAdminEmail({
    to: recipients,
    subject,
    text,
    html,
  });

  if (result.skipped) {
    return {
      sent: false,
      skipped: true,
      error:
        "Email is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.",
    };
  }

  if (!result.sent) {
    return { sent: false, error: "Failed to send email." };
  }

  return { sent: true };
}
