import {
  buildProductSchemaJson,
} from "@/lib/seo/product-schema";
import type { Product } from "@/lib/shopify/types";

type ProductSchemaProps = {
  product: Product;
  /** Site URL slug without leading slash (e.g. sidr-wild-honey). */
  slug: string;
};

/** Server-only JSON-LD Product schema for Google rich results. */
export default function ProductSchema({ product, slug }: ProductSchemaProps) {
  if (!product || !slug) return null;

  const json = buildProductSchemaJson(product, slug);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
