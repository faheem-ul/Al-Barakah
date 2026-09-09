/** Shared Al Barakah Honey email brand (matches Apps Script customer tracking emails). */
export const EMAIL_BRAND = {
  brown: "#302A25",
  mint: "#8FB69F",
  ink: "#1F150A",
  muted: "#6B6B6B",
  cream: "#F2EEE6",
  page: "#FDFBFF",
  white: "#FFFFFF",
  border: "#E8E2D8",
  whatsapp: "#25D366",
} as const;

export function escapeEmailHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BrandedEmailRow = {
  label: string;
  /** Already-safe HTML for the value cell (escape plain text before passing). */
  valueHtml: string;
};

export type BrandedEmailOptions = {
  eyebrow: string;
  /** Shown after Assalamualaikum when set */
  greetingName?: string;
  introHtml: string;
  badgeText?: string;
  badgeVariant?: "brown" | "mint" | "danger";
  rows?: BrandedEmailRow[];
  /** Extra HTML below the details table (items list, notes, etc.) */
  bodyHtml?: string;
  /** CTA block (WhatsApp / track button) */
  ctaHtml?: string;
  footerNote?: string;
  supportPhone?: string;
  supportTel?: string;
  siteUrl?: string;
  logoUrl?: string;
};

function badgeColors(variant: "brown" | "mint" | "danger" = "brown") {
  if (variant === "mint") {
    return { bg: EMAIL_BRAND.mint, color: EMAIL_BRAND.ink };
  }
  if (variant === "danger") {
    return { bg: "#b42318", color: EMAIL_BRAND.white };
  }
  return { bg: EMAIL_BRAND.brown, color: EMAIL_BRAND.white };
}

export function brandedDetailRowHtml(label: string, valueHtml: string): string {
  const b = EMAIL_BRAND;
  return (
    `<tr>` +
    `<td style="padding:11px 14px;border-bottom:1px solid ${b.border};background:${b.cream};color:${b.muted};width:38%;vertical-align:top;font-size:13px;">${escapeEmailHtml(label)}</td>` +
    `<td style="padding:11px 14px;border-bottom:1px solid ${b.border};vertical-align:top;color:${b.ink};font-size:14px;">${valueHtml}</td>` +
    `</tr>`
  );
}

export function brandedCtaButtonHtml(opts: {
  href: string;
  label: string;
  background?: string;
  color?: string;
}): string {
  const bg = opts.background || EMAIL_BRAND.brown;
  const color = opts.color || EMAIL_BRAND.white;
  return (
    `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 12px;"><tr>` +
    `<td align="center" style="border-radius:30px;background:${bg};">` +
    `<a href="${escapeEmailHtml(opts.href)}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;padding:14px 28px;font-size:14px;font-weight:700;border-radius:30px;line-height:1.2;">${escapeEmailHtml(opts.label)}</a>` +
    `</td></tr></table>`
  );
}

/**
 * Card layout: cream logo header, greeting, optional status pill,
 * bordered details table, optional body/CTA, cream footer.
 */
export function buildBrandedEmailHtml(options: BrandedEmailOptions): string {
  const b = EMAIL_BRAND;
  const siteUrl = (options.siteUrl || "https://www.albarakahoney.com").replace(
    /\/+$/,
    "",
  );
  const logoUrl = options.logoUrl || `${siteUrl}/logo.png`;
  const supportPhone = options.supportPhone || "+92 325 6957327";
  const supportTel = options.supportTel || "+923256957327";
  const badge = options.badgeText
    ? badgeColors(options.badgeVariant || "brown")
    : null;

  const greeting =
    options.greetingName && options.greetingName !== "Customer"
      ? `, <strong>${escapeEmailHtml(options.greetingName)}</strong>`
      : "";

  const rowsHtml = (options.rows || [])
    .map((row) => brandedDetailRowHtml(row.label, row.valueHtml))
    .join("");

  const detailsTable = rowsHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;font-size:14px;border:1px solid ${b.border};border-radius:10px;overflow:hidden;">${rowsHtml}</table>`
    : "";

  const badgeHtml = options.badgeText
    ? `<div style="margin:0 0 18px;text-align:center;"><span style="display:inline-block;background:${badge!.bg};color:${badge!.color};font-size:13px;font-weight:700;letter-spacing:0.04em;padding:8px 16px;border-radius:999px;">${escapeEmailHtml(options.badgeText)}</span></div>`
    : "";

  const footerNote =
    options.footerNote ||
    "Al Barakah Honey — automated notice. If you did not expect this email, reply and we will help immediately.";

  return (
    `<div style="margin:0;padding:0;background:${b.page};">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${b.page};padding:28px 12px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:${b.white};border-radius:14px;overflow:hidden;border:1px solid ${b.border};">` +
    `<tr><td style="padding:28px 28px 18px;text-align:center;background:${b.cream};border-bottom:1px solid ${b.border};">` +
    `<img src="${escapeEmailHtml(logoUrl)}" alt="Al Barakah Honey" width="148" style="display:block;margin:0 auto 10px;width:148px;max-width:60%;height:auto;border:0;" />` +
    `<div style="margin-top:8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${b.muted};font-family:Arial,sans-serif;font-weight:600;">${escapeEmailHtml(options.eyebrow)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:26px 28px 8px;font-family:Arial,sans-serif;color:${b.ink};font-size:15px;line-height:1.65;">` +
    `<p style="margin:0 0 14px;font-size:16px;">Assalamualaikum${greeting},</p>` +
    `<p style="margin:0 0 20px;color:${b.ink};">${options.introHtml}</p>` +
    badgeHtml +
    detailsTable +
    (options.bodyHtml || "") +
    (options.ctaHtml
      ? `<div style="margin:8px 0 18px;text-align:center;">${options.ctaHtml}</div>`
      : "") +
    `</td></tr>` +
    `<tr><td style="padding:20px 28px 28px;background:${b.cream};border-top:1px solid ${b.border};font-family:Arial,sans-serif;font-size:13px;color:${b.muted};line-height:1.55;">` +
    `<div style="margin:0 0 12px;padding:14px 16px;background:${b.white};border:1px solid ${b.border};border-radius:8px;">` +
    `<strong style="color:${b.brown};">Need help?</strong><br>` +
    `If you have any questions, call or WhatsApp us at <a href="tel:${escapeEmailHtml(supportTel)}" style="color:${b.brown};font-weight:700;text-decoration:none;">${escapeEmailHtml(supportPhone)}</a>` +
    `</div>` +
    `${escapeEmailHtml(footerNote)}<br><br>` +
    `Warm regards,<br><strong style="color:${b.brown};">Al Barakah Honey</strong><br>` +
    `<a href="${escapeEmailHtml(siteUrl)}" style="color:${b.muted};font-size:12px;">${escapeEmailHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>` +
    `</td></tr>` +
    `</table></td></tr></table></div>`
  );
}
