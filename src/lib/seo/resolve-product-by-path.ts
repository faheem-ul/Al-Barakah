import { cache } from "react";

import { getProductByHandle, getProducts } from "@/lib/shopify/actions/product";
import type { Product } from "@/lib/shopify/types";
import { RESERVED_ROOT_PATH_SEGMENTS } from "@/lib/seo/sitemap-urls";
import { toEnglishSlugFromTitle } from "@/lib/utils";

/** Resolve a product from the URL segment (`[handle]` route). */
export const resolveProductByPathSegment = cache(async function resolveProductByPathSegment(
  handle: string,
): Promise<Product | null> {
  if (RESERVED_ROOT_PATH_SEGMENTS.has(handle)) return null;

  let result = await getProductByHandle(handle);
  if (result.success && result.data) {
    return result.data as Product;
  }

  const all = await getProducts({ first: 200 });
  if (all.success && Array.isArray(all.data)) {
    const products = all.data as Product[];
    const match = products.find(
      (p) => toEnglishSlugFromTitle(p.title) === handle,
    );
    if (match) return match;
  }

  return null;
});
