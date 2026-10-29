import {
  brandedCtaButtonHtml,
  buildBrandedEmailHtml,
  EMAIL_BRAND,
  escapeEmailHtml,
} from "@/lib/email/branded-layout";
import { sendAdminEmail } from "@/lib/email/send";
import {
  formatLoyaltyAmount,
  type LoyaltyTier,
} from "@/lib/loyalty/segments";
import { siteBaseUrl } from "@/lib/whatsapp/delivery-issue-draft";

const TIER_VOUCHER_PATH: Record<number, string> = {
  150: "loyalty-voucher/150.webp",
  300: "loyalty-voucher/300.webp",
  500: "loyalty-voucher/500.webp",
};

/** Public URL for the tier voucher image in customer loyalty emails. */
export function loyaltyVoucherImageUrl(tier: LoyaltyTier): string {
  const override = process.env.LOYALTY_VOUCHER_IMAGE_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  const path =
    TIER_VOUCHER_PATH[tier.amount] ?? TIER_VOUCHER_PATH[150];
  const base = siteBaseUrl().replace(/\/+$/, "");
  return `${base}/images/${path}`;
}

function loyaltyVoucherImageHtml(
  imageUrl: string,
  code: string,
  amountLabel: string,
): string {
  const alt = `Loyalty voucher — ${code}, ${amountLabel} off your next order`;
  return (
    `<div style="margin:0 0 16px;text-align:center;">` +
    `<img src="${escapeEmailHtml(imageUrl)}" alt="${escapeEmailHtml(alt)}" width="520" ` +
    `style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;border-radius:8px;" />` +
    `</div>`
  );
}

export type LoyaltyCouponEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Shared loyalty coupon email (paid-order webhook + future bulk campaign).
 */
export function buildLoyaltyCouponEmailContent(params: {
  greetingName: string;
  tier: LoyaltyTier;
}): LoyaltyCouponEmailContent {
  const name = params.greetingName.trim() || "Customer";
  const { code, amount } = params.tier;
  const amountLabel = formatLoyaltyAmount(amount);
  const shopUrl = siteBaseUrl();
  const imageUrl = loyaltyVoucherImageUrl(params.tier);

  const subject = `${amountLabel} off your next order — code ${code}`;

  const bodyHtml =
    loyaltyVoucherImageHtml(imageUrl, code, amountLabel) +
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.ink};">` +
    `Enter the code <strong style="letter-spacing:0.06em;">${escapeEmailHtml(code)}</strong> at checkout on your <strong>next</strong> order. One use per customer.` +
    `</p>` +
    `<p style="margin:0;font-size:13px;line-height:1.55;color:${EMAIL_BRAND.muted};">` +
    `This offer is for customers who have ordered with us before.` +
    `</p>`;

  const html = buildBrandedEmailHtml({
    eyebrow: "Loyalty coupon",
    greetingName: name,
    introHtml:
      "Thank you for your order. As a returning customer, you can save on your next purchase with the voucher below.",
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
    `Enter the code at checkout. One use per customer. For customers who have ordered with us before.\n\n` +
    `Shop again: ${shopUrl}\n`;

  return { subject, html, text };
}

export async function sendLoyaltyCouponEmail(params: {
  to: string;
  greetingName: string;
  tier: LoyaltyTier;
}): Promise<{ sent: boolean; skipped?: boolean }> {
  const { subject, html, text } = buildLoyaltyCouponEmailContent({
    greetingName: params.greetingName,
    tier: params.tier,
  });
  return sendAdminEmail({ to: params.to, subject, html, text });
}
