import type { NumericSettingsKey, SalesSettings } from "./types";

export type ProductCatalogItem = {
  key: string;
  product: string;
  variant: string;
  weight: number;
  priceKey: NumericSettingsKey;
  costKey: NumericSettingsKey;
};

export const PRODUCTS: ProductCatalogItem[] = [
  {
    key: "m500",
    product: "Apis Mellifera",
    variant: "500g",
    weight: 0.5,
    priceKey: "p_m500",
    costKey: "c_m500",
  },
  {
    key: "m1000",
    product: "Apis Mellifera",
    variant: "1kg",
    weight: 1,
    priceKey: "p_m1000",
    costKey: "c_m1000",
  },
  {
    key: "f500",
    product: "Apis Florea Wild Honey",
    variant: "500g",
    weight: 0.5,
    priceKey: "p_f500",
    costKey: "c_f500",
  },
  {
    key: "f1000",
    product: "Apis Florea Wild Honey",
    variant: "1kg",
    weight: 1,
    priceKey: "p_f1000",
    costKey: "c_f1000",
  },
  {
    key: "s500",
    product: "Sidr Wild Honey",
    variant: "500g",
    weight: 0.5,
    priceKey: "p_s500",
    costKey: "c_s500",
  },
  {
    key: "s1000",
    product: "Sidr Wild Honey",
    variant: "1kg",
    weight: 1,
    priceKey: "p_s1000",
    costKey: "c_s1000",
  },
];

export const PRODUCT_NAMES = [
  ...new Set(PRODUCTS.map((p) => p.product)),
];

export function getProductByKey(key: string) {
  return PRODUCTS.find((p) => p.key === key);
}

export function getVariantsForProduct(productName: string) {
  return PRODUCTS.filter((p) => p.product === productName);
}
