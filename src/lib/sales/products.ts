import type { LegacySalesPriceKey, SalesCatalogProduct } from "./types";

export const DEFAULT_CATALOG_PRODUCTS: SalesCatalogProduct[] = [
  {
    id: "m500",
    product: "Apis Mellifera",
    variant: "500g",
    sellingPrice: 1199,
    purchasePrice: 450,
    weight: 0.5,
    packUnits500: 1,
    packUnits1000: 0,
    stockItem: true,
    createdAt: 0,
  },
  {
    id: "m1000",
    product: "Apis Mellifera",
    variant: "1kg",
    sellingPrice: 2099,
    purchasePrice: 900,
    weight: 1,
    packUnits500: 0,
    packUnits1000: 1,
    stockItem: true,
    createdAt: 0,
  },
  {
    id: "f500",
    product: "Apis Florea Wild Honey",
    variant: "500g",
    sellingPrice: 1899,
    purchasePrice: 1000,
    weight: 0.5,
    packUnits500: 1,
    packUnits1000: 0,
    stockItem: true,
    createdAt: 0,
  },
  {
    id: "f1000",
    product: "Apis Florea Wild Honey",
    variant: "1kg",
    sellingPrice: 3499,
    purchasePrice: 2000,
    weight: 1,
    packUnits500: 0,
    packUnits1000: 1,
    stockItem: true,
    createdAt: 0,
  },
  {
    id: "s500",
    product: "Sidr Wild Honey",
    variant: "500g",
    sellingPrice: 2099,
    purchasePrice: 1200,
    weight: 0.5,
    packUnits500: 1,
    packUnits1000: 0,
    stockItem: true,
    createdAt: 0,
  },
  {
    id: "s1000",
    product: "Sidr Wild Honey",
    variant: "1kg",
    sellingPrice: 3899,
    purchasePrice: 2400,
    weight: 1,
    packUnits500: 0,
    packUnits1000: 1,
    stockItem: true,
    createdAt: 0,
  },
];

export const LEGACY_PRICE_MAP: Record<
  string,
  { sell: LegacySalesPriceKey; buy: LegacySalesPriceKey }
> = {
  m500: { sell: "p_m500", buy: "c_m500" },
  m1000: { sell: "p_m1000", buy: "c_m1000" },
  f500: { sell: "p_f500", buy: "c_f500" },
  f1000: { sell: "p_f1000", buy: "c_f1000" },
  s500: { sell: "p_s500", buy: "c_s500" },
  s1000: { sell: "p_s1000", buy: "c_s1000" },
};

export const LEGACY_PRICE_KEYS: LegacySalesPriceKey[] = [
  "p_m500",
  "c_m500",
  "p_m1000",
  "c_m1000",
  "p_f500",
  "c_f500",
  "p_f1000",
  "c_f1000",
  "p_s500",
  "c_s500",
  "p_s1000",
  "c_s1000",
];

export function getProductById(
  catalog: SalesCatalogProduct[],
  id: string,
): SalesCatalogProduct | undefined {
  return catalog.find((item) => item.id === id);
}

/** @deprecated Use getProductById */
export function getProductByKey(
  catalog: SalesCatalogProduct[],
  key: string,
): SalesCatalogProduct | undefined {
  return getProductById(catalog, key);
}

export function getProductNames(catalog: SalesCatalogProduct[]): string[] {
  return [...new Set(catalog.map((item) => item.product))];
}

export function getVariantsForProduct(
  catalog: SalesCatalogProduct[],
  productName: string,
): SalesCatalogProduct[] {
  return catalog.filter((item) => item.product === productName);
}

export function getStockProductNames(catalog: SalesCatalogProduct[]): string[] {
  return [
    ...new Set(
      catalog.filter((item) => item.stockItem).map((item) => item.product),
    ),
  ];
}

export function formatProductLineLabel(product: string, variant: string): string {
  if (product === variant) return product;
  return `${product} ${variant}`;
}

export function createEmptyCatalogProduct(): SalesCatalogProduct {
  return {
    id: crypto.randomUUID(),
    product: "",
    variant: "",
    sellingPrice: 0,
    purchasePrice: 0,
    weight: 0.5,
    packUnits500: 1,
    packUnits1000: 0,
    stockItem: false,
    createdAt: Date.now(),
  };
}
