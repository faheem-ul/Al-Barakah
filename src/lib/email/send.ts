import nodemailer from "nodemailer";
import { Resend } from "resend";

import { humanizeEmailDeliveryError } from "@/lib/email/delivery-error-message";
import { validateRecipientEmail } from "@/lib/email/validate-recipient-email";

const LOG = "[Admin Email]";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Resend tag — used to match bounce webhooks to loyalty-voucher-sends docs. */
  loyaltyOrderKey?: string;
  /** Skip Resend and use SMTP only (loyalty + Gmail bounce sync). */
  preferSmtp?: boolean;
};

function fromAddress(): string {
  return (
    process.env.ADMIN_EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Al Barakah Honey <onboarding@resend.dev>"
  );
}

export type SendEmailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  emailProvider?: "resend" | "smtp";
  /** Resend email id — delivery webhooks reference this. */
  providerMessageId?: string;
};

async function sendViaResend(
  input: SendEmailInput,
): Promise<SendEmailResult | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const resend = new Resend(apiKey);
  const orderKey = input.loyaltyOrderKey?.trim().replace(/^#+/, "");
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(orderKey
      ? { tags: [{ name: "loyalty_order", value: orderKey.slice(0, 256) }] }
      : {}),
  });

  if (error) {
    console.error(`${LOG} Resend failed:`, error);
    const raw = error.message || "Resend send failed";
    return {
      sent: false,
      error: humanizeEmailDeliveryError(raw),
      emailProvider: "resend",
    };
  }
  console.log(`${LOG} Sent via Resend to`, input.to, data?.id || "");
  return {
    sent: true,
    emailProvider: "resend",
    providerMessageId: data?.id,
  };
}

async function sendViaSmtp(
  input: SendEmailInput,
): Promise<SendEmailResult | null> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    const rejected = (
      Array.isArray(info.rejected) ? info.rejected : []
    ).map(String);
    if (rejected.length > 0) {
      const message = `SMTP rejected recipient(s): ${rejected.join(", ")}`;
      console.warn(`${LOG} ${message}`);
      return {
        sent: false,
        error: humanizeEmailDeliveryError(message),
        emailProvider: "smtp",
      };
    }

    const response = String(info.response || "").toLowerCase();
    if (
      response.includes("550") ||
      response.includes("551") ||
      response.includes("553") ||
      response.includes("user unknown") ||
      response.includes("address rejected")
    ) {
      const message = info.response || "SMTP rejected delivery";
      console.warn(`${LOG} ${message}`);
      return {
        sent: false,
        error: humanizeEmailDeliveryError(message),
        emailProvider: "smtp",
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} SMTP failed:`, err);
    return {
      sent: false,
      error: humanizeEmailDeliveryError(message),
      emailProvider: "smtp",
    };
  }
  console.log(`${LOG} Sent via SMTP to`, input.to);
  return { sent: true, emailProvider: "smtp" };
}

/**
 * Prefer Resend (RESEND_API_KEY), else Gmail/SMTP (SMTP_HOST + USER + PASS).
 * Returns false if neither is configured (webhook should still succeed).
 */
function normalizeRecipients(
  to: string | string[],
): { ok: true; list: string[] } | { ok: false; error: string } {
  const list = (Array.isArray(to) ? to : [to]).map((v) => String(v).trim());
  if (!list.length) {
    return { ok: false, error: "Email address is required." };
  }
  const normalized: string[] = [];
  for (const addr of list) {
    const check = validateRecipientEmail(addr);
    if (!check.ok) return check;
    normalized.push(check.email);
  }
  return { ok: true, list: normalized };
}

export async function sendAdminEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const recipients = normalizeRecipients(input.to);
  if (!recipients.ok) {
    return { sent: false, error: recipients.error };
  }

  const payload = { ...input, to: recipients.list };

  if (!payload.preferSmtp) {
    const resendResult = await sendViaResend(payload);
    if (resendResult) return resendResult;
  }

  const smtpResult = await sendViaSmtp(payload);
  if (smtpResult) return smtpResult;

  console.warn(
    `${LOG} Skipped — set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS`,
  );
  return { sent: false, skipped: true };
}

export function adminNotifyEmail(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    "thealbarakahoney@gmail.com"
  );
}
