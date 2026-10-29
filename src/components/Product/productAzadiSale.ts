import type { Product } from "@/lib/shopify/types";

export function isAzadiSaleProduct(product: Product): boolean {
  return Boolean(
    product.collections?.some(
      (collection) => collection.handle === "azadi-sale",
    ),
  );
}
