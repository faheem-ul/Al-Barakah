import { toEnglishSlugFromTitle } from "@/lib/utils";
import type { Product } from "@/lib/shopify/types";

/** Canonical origin for sitemap and robots (www). */
export const SITEMAP_BASE_URL = "https://www.albarakahoney.com";

/**
 * Shopify handle → website path when they differ.
 * Confirmed in docs/seo/sitemap-phase1-audit.md (Phase 1).
 */
export const SITEMAP_URL_OVERRIDES: Record<string, string> = {
  "test-product": "/apis-florea-wild-honey",
  "apis-mellifera-honey-bari-makhi-ka-shahad": "/apis-mellifera-honey",
  "بیری-چھوٹی-مکھي-کا-شہد-honey-from-the-small-berry-bee": "/sidr-wild-honey",
};

/** Brief / SEO: never include in sitemap. */
export const SITEMAP_HANDLE_DENYLIST = new Set([
  "deal1",
  "deal2",
  "deal3",
  "deal4",
  "deal5",
]);

/** Static routes (home uses ""). */
export const SITEMAP_STATIC_PATHS = [
  "",
  "/about-us",
  "/contact-us",
  "/blog",
  "/blog/how-to-identify-pure-honey",
  "/blog/sidr-beri-honey-guide",
  "/blog/bari-makhi-vs-chhoti-makhi-honey",
  "/blog/talbina-recipe-with-honey",
  "/terms-and-conditions",
  "/privacy-policy",
  "/refund-policy",
  "/ownership-statement",
] as const;

export function productPublicPath(product: Pick<Product, "handle" | "title">): string {
  const override = SITEMAP_URL_OVERRIDES[product.handle];
  if (override) return override;
  const slug = toEnglishSlugFromTitle(product.title);
  if (slug) return `/${slug}`;
  return `/${product.handle}`;
}

export function absoluteSitemapUrl(path: string): string {
  if (path === "" || path === "/") return `${SITEMAP_BASE_URL}/`;
  return `${SITEMAP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Paths that must not be treated as product handles by `[handle]`. */
export const RESERVED_ROOT_PATH_SEGMENTS = new Set([
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
]);
