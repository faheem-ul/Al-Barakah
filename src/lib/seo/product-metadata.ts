import type { Metadata } from "next";

import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";
import { productPublicPath } from "@/lib/seo/sitemap-urls";
import type { Product } from "@/lib/shopify/types";

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function productSeoTitle(product: Product): string {
  const fromSeo = product.seo?.title?.trim();
  if (fromSeo) return fromSeo;
  return `${product.title} – Al-Barakah`;
}

export function productSeoDescription(product: Product): string {
  const fromSeo = product.seo?.description?.trim();
  if (fromSeo) return fromSeo;

  const plain = stripHtml(product.description || "");
  if (plain) return plain.slice(0, 155).trim();

  return "Pure wild honey from Al-Barakah Honey, Pakistan.";
}

export function buildProductPageMetadata(product: Product): Metadata {
  const canonicalPath = productPublicPath(product);
  const title = productSeoTitle(product);
  const description = productSeoDescription(product);
  const imageUrl = product.images?.[0]?.url;

  return {
    title: { absolute: title },
    description,
    alternates: pageCanonicalAlternates(canonicalPath),
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
