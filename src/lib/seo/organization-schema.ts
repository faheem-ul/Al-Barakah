export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Al-Barakah Honey",
  alternateName: "البركة Honey",
  url: "https://www.albarakahoney.com",
  logo: "https://www.albarakahoney.com/logo.png",
  description:
    "100% pure wild honey in Pakistan – Sidr (Beri), Bari Makhi and Chhoti Makhi شہد. Free delivery across Pakistan.",
  areaServed: "PK",
  sameAs: [
    "https://www.instagram.com/thealbarakahoney",
    "https://www.facebook.com/thealbarakahoney/",
    "https://www.tiktok.com/@thealbarakahoney",
  ],
} as const;

export function organizationSchemaJsonHtml(): string {
  return JSON.stringify(organizationSchema).replace(/</g, "\\u003c");
}
