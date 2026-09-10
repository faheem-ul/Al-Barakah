import { db, doc, getDoc, setDoc } from "@/lib/firebase";

import { DEFAULT_SALES_SETTINGS } from "./defaults";
import {
  DEFAULT_CATALOG_PRODUCTS,
  LEGACY_PRICE_KEYS,
  LEGACY_PRICE_MAP,
} from "./products";
import type {
  CustomExpense,
  LegacySalesSettingsDoc,
  NumericSettingsKey,
  SalesCatalogProduct,
  SalesSettings,
} from "./types";

const SETTINGS_DOC_PATH = ["sales-settings", "default"] as const;
const MAX_CUSTOM_EXPENSES = 20;
const MAX_CATALOG_PRODUCTS = 100;

const NUMERIC_KEYS: NumericSettingsKey[] = [
  "freeThreshold",
  "ship1",
  "ship3",
  "ship4",
  "packing500",
  "packing1000",
  "courierOcWithinHalf",
  "courierOcWithinOne",
  "courierOcWithinAdditional",
  "courierOcSameHalf",
  "courierOcSameOne",
  "courierOcSameAdditional",
  "courierOcDiffHalf",
  "courierOcDiffOne",
  "courierOcDiffAdditional",
  "courierSecondDay",
  "courierSecondDayAdditional",
  "fac",
];

function normalizeCustomExpenses(raw: unknown): CustomExpense[] {
  if (!Array.isArray(raw)) return [];

  const expenses: CustomExpense[] = [];

  for (const item of raw.slice(0, MAX_CUSTOM_EXPENSES)) {
    if (!item || typeof item !== "object") continue;

    const record = item as Partial<CustomExpense>;
    const name = String(record.name ?? "").trim();
    if (!name) continue;

    expenses.push({
      id:
        typeof record.id === "string" && record.id
          ? record.id
          : crypto.randomUUID(),
      name: name.slice(0, 40),
      amount: Math.max(0, Number(record.amount) || 0),
      enabled: record.enabled !== false,
    });
  }

  return expenses;
}

function applyPackUnitsFallback(
  weight: number,
  packUnits500: number | undefined,
  packUnits1000: number | undefined,
): { packUnits500: number; packUnits1000: number } {
  const has500 = packUnits500 !== undefined && !Number.isNaN(packUnits500);
  const has1000 = packUnits1000 !== undefined && !Number.isNaN(packUnits1000);

  if (has500 && has1000) {
    return {
      packUnits500: Math.max(0, Number(packUnits500) || 0),
      packUnits1000: Math.max(0, Number(packUnits1000) || 0),
    };
  }

  if (weight <= 0.5) {
    return {
      packUnits500: has500 ? Math.max(0, Number(packUnits500) || 0) : 1,
      packUnits1000: has1000 ? Math.max(0, Number(packUnits1000) || 0) : 0,
    };
  }

  return {
    packUnits500: has500 ? Math.max(0, Number(packUnits500) || 0) : 0,
    packUnits1000: has1000 ? Math.max(0, Number(packUnits1000) || 0) : 1,
  };
}

function normalizeCatalogProduct(
  raw: unknown,
  fallbackCreatedAt?: number,
): SalesCatalogProduct | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Partial<SalesCatalogProduct>;
  const product = String(record.product ?? "").trim();
  const variant = String(record.variant ?? "").trim();
  if (!product || !variant) return null;

  const weight = Math.max(0, Number(record.weight) || 0.5);
  const packUnits = applyPackUnitsFallback(
    weight,
    record.packUnits500,
    record.packUnits1000,
  );

  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : crypto.randomUUID(),
    product: product.slice(0, 80),
    variant: variant.slice(0, 80),
    sellingPrice: Math.max(0, Number(record.sellingPrice) || 0),
    purchasePrice: Math.max(0, Number(record.purchasePrice) || 0),
    weight,
    packUnits500: packUnits.packUnits500,
    packUnits1000: packUnits.packUnits1000,
    stockItem: record.stockItem !== false,
    createdAt:
      typeof record.createdAt === "number"
        ? record.createdAt
        : (fallbackCreatedAt ?? Date.now()),
  };
}

function normalizeCatalogProducts(raw: unknown): SalesCatalogProduct[] {
  if (!Array.isArray(raw)) return [];

  const products: SalesCatalogProduct[] = [];

  for (const item of raw.slice(0, MAX_CATALOG_PRODUCTS)) {
    const normalized = normalizeCatalogProduct(item);
    if (normalized) products.push(normalized);
  }

  return products;
}

function hasLegacyPrices(data: LegacySalesSettingsDoc): boolean {
  return LEGACY_PRICE_KEYS.some(
    (key) => data[key] !== undefined && data[key] !== null,
  );
}

function resolveCatalogPrice(
  firestoreData: LegacySalesSettingsDoc,
  id: string,
  field: "sellingPrice" | "purchasePrice",
  fallback: number,
): number {
  const keys = LEGACY_PRICE_MAP[id];
  if (!keys) return fallback;

  const legacyKey = field === "sellingPrice" ? keys.sell : keys.buy;
  const fromFirestore = firestoreData[legacyKey];
  if (fromFirestore !== undefined && fromFirestore !== null) {
    return Number(fromFirestore) || 0;
  }

  return fallback;
}

function buildCatalogFromLegacy(
  data: LegacySalesSettingsDoc,
): SalesCatalogProduct[] {
  const now = Date.now();

  return DEFAULT_CATALOG_PRODUCTS.map((template) => ({
    ...template,
    sellingPrice: resolveCatalogPrice(
      data,
      template.id,
      "sellingPrice",
      template.sellingPrice,
    ),
    purchasePrice: resolveCatalogPrice(
      data,
      template.id,
      "purchasePrice",
      template.purchasePrice,
    ),
    createdAt: template.createdAt || now,
  }));
}

function seedDefaultCatalog(): SalesCatalogProduct[] {
  const now = Date.now();

  return DEFAULT_CATALOG_PRODUCTS.map((template) => ({
    ...template,
    createdAt: template.createdAt || now,
  }));
}

function resolveCatalogProducts(
  data: LegacySalesSettingsDoc & { catalogProducts?: unknown },
): SalesCatalogProduct[] {
  const existing = normalizeCatalogProducts(data.catalogProducts);
  if (existing.length > 0) return existing;

  if (hasLegacyPrices(data)) {
    return buildCatalogFromLegacy(data);
  }

  return seedDefaultCatalog();
}

function normalizeSettings(
  data: LegacySalesSettingsDoc & Partial<SalesSettings> & { packing?: number },
): SalesSettings {
  const normalized: SalesSettings = {
    ...DEFAULT_SALES_SETTINGS,
    catalogProducts: resolveCatalogProducts(data),
  };

  for (const key of NUMERIC_KEYS) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      normalized[key] = Number(value) || 0;
    }
  }

  const legacyPacking = Number(data.packing) || 0;
  if (legacyPacking > 0) {
    if (data.packing500 === undefined && data.packing1000 === undefined) {
      normalized.packing500 = legacyPacking;
      normalized.packing1000 = legacyPacking;
    } else {
      if (data.packing500 === undefined) {
        normalized.packing500 = legacyPacking;
      }
      if (data.packing1000 === undefined) {
        normalized.packing1000 = legacyPacking;
      }
    }
  }

  if (typeof data.updatedAt === "number") {
    normalized.updatedAt = data.updatedAt;
  }

  normalized.customExpenses = normalizeCustomExpenses(data.customExpenses);

  if (typeof data.zeroActualCourier === "boolean") {
    normalized.zeroActualCourier = data.zeroActualCourier;
  }

  return normalized;
}

export async function getSalesSettings(): Promise<SalesSettings> {
  const ref = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { ...DEFAULT_SALES_SETTINGS };
  }

  return normalizeSettings(
    snap.data() as LegacySalesSettingsDoc &
      Partial<SalesSettings> & { packing?: number },
  );
}

export async function saveSalesSettings(
  settings: SalesSettings,
): Promise<void> {
  const ref = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const payload = normalizeSettings({
    ...settings,
    updatedAt: Date.now(),
  });
  await setDoc(ref, payload, { merge: true });
}
