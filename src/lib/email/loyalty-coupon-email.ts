import {
  brandedCtaButtonHtml,
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { sendAdminEmail, type SendEmailResult } from "@/lib/email/send";
import {
  formatLoyaltyAmount,
  type LoyaltyTier,
} from "@/lib/loyalty/segments";
import { siteBaseUrl } from "@/lib/whatsapp/delivery-issue-draft";

export type LoyaltyCouponEmailContent = {
  subject: string;
  html: string;
  text: string;
};

function loyaltyCodeBlockHtml(code: string, amountLabel: string): string {
  return (
    `<div style="margin:0 0 16px;padding:16px 20px;text-align:center;background:${EMAIL_BRAND.cream};border:1px solid ${EMAIL_BRAND.border};border-radius:8px;">` +
    `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.muted};">Your coupon code</p>` +
    `<p style="margin:0 0 6px;font-size:22px;font-weight:700;letter-spacing:0.1em;color:${EMAIL_BRAND.ink};">${escapeEmailHtml(code)}</p>` +
    `<p style="margin:0;font-size:14px;color:${EMAIL_BRAND.brown};">${escapeEmailHtml(amountLabel)} off your next order</p>` +
    `</div>`
  );
}

/**
 * Shared loyalty coupon email (paid-order webhook).
 * Tier from current order total (see segments.ts); one send per order in Firestore.
 */
export function buildLoyaltyCouponEmailContent(params: {
  greetingName: string;
  tier: LoyaltyTier;
}): LoyaltyCouponEmailContent {
  const name = params.greetingName.trim() || "Customer";
  const { code, amount, minimumPurchasePkr } = params.tier;
  const amountLabel = formatLoyaltyAmount(amount);
  const minLabel = formatLoyaltyAmount(minimumPurchasePkr);
  const shopUrl = siteBaseUrl();

  const subject = `${amountLabel} off your next order — code ${code}`;

  const bodyHtml =
    loyaltyCodeBlockHtml(code, amountLabel) +
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.ink};">` +
    `Enter this code at checkout on your <strong>next</strong> order (minimum purchase ${escapeEmailHtml(minLabel)}). This code is unique to your account and can be used <strong>once</strong>. It cannot be combined with other discounts.` +
    `</p>` +
    `<p style="margin:0;font-size:13px;line-height:1.55;color:${EMAIL_BRAND.muted};">` +
    `This offer is for customers who have ordered with us before.` +
    `</p>`;

  const html = buildBrandedEmailHtml({
    eyebrow: "Loyalty coupon",
    greetingName: name,
    introHtml:
      "Thank you for your order. As a returning customer, you can save on your next purchase with the code below.",
    bodyHtml,
    ctaHtml: brandedCtaButtonHtml({
      href: shopUrl,
      label: "Shop again",
      background: EMAIL_BRAND.brown,
    }),
    siteUrl: shopUrl,
  });

  const text =
    `Assalamualaikum${name && name !== "Customer" ? `, ${name}` : ""},\n\n` +
    `Thank you for your order. Save on your next purchase with this coupon:\n\n` +
    `Coupon code: ${code}\n` +
    `Discount: ${amountLabel} off your next order\n\n` +
    `Minimum purchase on your next order: ${minLabel}\n` +
    `This code is unique to your account, single use, and cannot be combined with other discounts.\n\n` +
    `For customers who have ordered with us before.\n\n` +
    `Shop again: ${shopUrl}\n`;

  return { subject, html, text };
}

export async function sendLoyaltyCouponEmail(params: {
  to: string;
  greetingName: string;
  tier: LoyaltyTier;
  loyaltyOrderKey?: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = buildLoyaltyCouponEmailContent({
    greetingName: params.greetingName,
    tier: params.tier,
  });
  const preferSmtp =
    process.env.LOYALTY_EMAIL_SMTP_ONLY?.trim().toLowerCase() === "true";

  return sendAdminEmail({
    to: params.to,
    subject,
    html,
    text,
    loyaltyOrderKey: params.loyaltyOrderKey,
    preferSmtp,
  });
}
