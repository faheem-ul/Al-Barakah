import nodemailer from "nodemailer";
import { Resend } from "resend";

const LOG = "[Admin Email]";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
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
};

async function sendViaResend(
  input: SendEmailInput,
): Promise<SendEmailResult | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });

  if (error) {
    console.error(`${LOG} Resend failed:`, error);
    return {
      sent: false,
      error: error.message || "Resend send failed",
      emailProvider: "resend",
    };
  }
  console.log(`${LOG} Sent via Resend to`, input.to);
  return { sent: true, emailProvider: "resend" };
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
    await transporter.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} SMTP failed:`, err);
    return { sent: false, error: message, emailProvider: "smtp" };
  }
  console.log(`${LOG} Sent via SMTP to`, input.to);
  return { sent: true, emailProvider: "smtp" };
}

/**
 * Prefer Resend (RESEND_API_KEY), else Gmail/SMTP (SMTP_HOST + USER + PASS).
 * Returns false if neither is configured (webhook should still succeed).
 */
export async function sendAdminEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const resendResult = await sendViaResend(input);
  if (resendResult) return resendResult;

  const smtpResult = await sendViaSmtp(input);
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
