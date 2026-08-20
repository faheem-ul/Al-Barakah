import nodemailer from "nodemailer";
import { Resend } from "resend";

const LOG = "[Admin Email]";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function fromAddress(): string {
  return (
    process.env.ADMIN_EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Al Barakah Honey <onboarding@resend.dev>"
  );
}

async function sendViaResend(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error(`${LOG} Resend failed:`, error);
    throw new Error(error.message || "Resend send failed");
  }
  console.log(`${LOG} Sent via Resend to`, input.to);
  return true;
}

async function sendViaSmtp(input: SendEmailInput): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  console.log(`${LOG} Sent via SMTP to`, input.to);
  return true;
}

/**
 * Prefer Resend (RESEND_API_KEY), else Gmail/SMTP (SMTP_HOST + USER + PASS).
 * Returns false if neither is configured (webhook should still succeed).
 */
export async function sendAdminEmail(
  input: SendEmailInput,
): Promise<{ sent: boolean; skipped?: boolean }> {
  try {
    if (await sendViaResend(input)) return { sent: true };
    if (await sendViaSmtp(input)) return { sent: true };
    console.warn(
      `${LOG} Skipped — set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS`,
    );
    return { sent: false, skipped: true };
  } catch (err) {
    console.error(`${LOG} FAILED:`, err);
    return { sent: false };
  }
}

export function adminNotifyEmail(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    "thealbarakahoney@gmail.com"
  );
}
