import type { Product } from "@/lib/shopify/types";
import { absoluteSitemapUrl, productPublicPath } from "@/lib/seo/sitemap-urls";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";
const NEW_CONDITION = "https://schema.org/NewCondition";

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function offerShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: 0,
      currency: "PKR",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "PK",
    },
  };
}

function variantOfferName(productTitle: string, variantTitle: string): string {
  if (!variantTitle || variantTitle === "Default Title") return productTitle;
  return `${productTitle} – ${variantTitle}`;
}

export function siteSlugFromProduct(product: Pick<Product, "handle" | "title">): string {
  return productPublicPath(product).replace(/^\//, "");
}

export function buildProductSchemaObject(
  product: Product,
  slug: string,
): Record<string, unknown> {
  const url = absoluteSitemapUrl(`/${slug}`);
  const images = (product.images ?? [])
    .map((img) => img.url)
    .filter(Boolean);

  const offers = (product.variants ?? []).map((v) => ({
    "@type": "Offer",
    name: variantOfferName(product.title, v.title),
    url,
    priceCurrency: v.price?.currencyCode || "PKR",
    price: Number(v.price?.amount ?? 0).toFixed(2),
    availability: v.availableForSale ? IN_STOCK : OUT_OF_STOCK,
    itemCondition: NEW_CONDITION,
    seller: {
      "@type": "Organization",
      name: "Al-Barakah Honey",
    },
    shippingDetails: offerShippingDetails(),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    description: stripHtml(product.description || ""),
    image: images.length ? images : undefined,
    url,
    brand: {
      "@type": "Brand",
      name: "Al-Barakah",
    },
    offers: offers.length === 1 ? offers[0] : offers,
  };
}

/** Safe JSON-LD string for script tag (escape `<`). */
export function buildProductSchemaJson(product: Product, slug: string): string {
  const schema = buildProductSchemaObject(product, slug);
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
