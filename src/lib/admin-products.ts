export const ADMIN_PRODUCTS = [
  {
    id: "8246965305484",
    label: "بڑی مکھی کا جنگلی شہد — Apis mellifera honey",
  },
  {
    id: "8247172300940",
    label: "چھوٹی مکھی کا جنگلی شہد — Apis florea wild honey",
  },
  {
    id: "8251610857612",
    label: "بیری چھوٹی مکھی کا شہد — Sidr Wild Honey",
  },
] as const;

export type AdminProductId = (typeof ADMIN_PRODUCTS)[number]["id"];

export const PREMIUM_PRODUCT_ID = "8251610857612";

/** Normalize Shopify GID or bare ID to numeric product id. */
export function numericProductId(productId?: string): string {
  if (!productId) return "";
  const m = productId.match(/(\d+)$/);
  return m ? m[1] : productId;
}

export function adminProductLabel(productId?: string): string | undefined {
  const id = numericProductId(productId);
  return ADMIN_PRODUCTS.find((p) => p.id === id)?.label;
}

export function isPremiumProduct(productId?: string): boolean {
  return numericProductId(productId) === PREMIUM_PRODUCT_ID;
}
