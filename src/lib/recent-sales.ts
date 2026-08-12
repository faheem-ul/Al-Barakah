import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getAdminDb } from "@/lib/firebase/admin";
import type { RecentSale, RecentSaleInput } from "@/lib/recent-sales.types";
import { salesPopupConfig } from "@/lib/salesPopup.config";

export type { RecentSale, RecentSaleInput } from "@/lib/recent-sales.types";

export const RECENT_SALES_CACHE_TAG = "recent-sales";

type CachedRecentSalesSnapshot = {
  sales: RecentSale[];
  cachedAt: number;
};

const formatCacheAge = (ageMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(ageMs / 1000));

  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const isRecentSale = (value: unknown): value is RecentSale => {
  if (!value || typeof value !== "object") return false;

  const sale = value as Partial<RecentSale>;

  return (
    typeof sale.id === "string" &&
    typeof sale.shopifyOrderId === "string" &&
    typeof sale.lineItemId === "string" &&
    typeof sale.firstName === "string" &&
    typeof sale.city === "string" &&
    typeof sale.productTitle === "string" &&
    typeof sale.productImage === "string" &&
    typeof sale.createdAt === "number" &&
    Number.isFinite(sale.createdAt)
  );
};

const getCutoffMs = (now = Date.now()) =>
  now - salesPopupConfig.maxAgeDays * 24 * 60 * 60 * 1000;

/**
 * Fisher–Yates shuffle (mutates a copy).
 */
const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

/**
 * Prefer newer purchases while still allowing older ones within the window.
 * Weight ≈ relative recency so newer sales are more likely to be picked.
 */
const weightedSamplePreferringNewer = (
  sales: RecentSale[],
  sampleSize: number,
  now = Date.now()
): RecentSale[] => {
  if (sales.length <= sampleSize) {
    return shuffle(sales);
  }

  const cutoff = getCutoffMs(now);
  const pool = sales.map((sale) => {
    const age = Math.max(0, now - sale.createdAt);
    const window = Math.max(1, now - cutoff);
    // Newer → higher weight (1.0 near now, ~0.15 near cutoff)
    const weight = 0.15 + 0.85 * (1 - Math.min(1, age / window));
    return { sale, weight };
  });

  const selected: RecentSale[] = [];
  const remaining = [...pool];

  while (selected.length < sampleSize && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let ticket = Math.random() * totalWeight;
    let pickedIndex = remaining.length - 1;

    for (let i = 0; i < remaining.length; i += 1) {
      ticket -= remaining[i].weight;
      if (ticket <= 0) {
        pickedIndex = i;
        break;
      }
    }

    selected.push(remaining[pickedIndex].sale);
    remaining.splice(pickedIndex, 1);
  }

  return selected;
};

/**
 * Persist privacy-safe sales from a Shopify order webhook.
 * Doc ids are `{orderId}_{lineItemId}` so Shopify redeliveries are idempotent.
 */
export const saveRecentSales = async (
  sales: RecentSaleInput[]
): Promise<number> => {
  if (sales.length === 0) {
    return 0;
  }

  const db = getAdminDb();
  const batch = db.batch();

  for (const sale of sales) {
    const ref = db.collection(salesPopupConfig.collection).doc(sale.id);
    batch.set(ref, sale, { merge: true });
  }

  await batch.commit();
  return sales.length;
};

/**
 * Query Firestore for purchases within the max-age window.
 *
 * Requires a composite index on `recent-sales`:
 *   createdAt Ascending (equality/range) + orderBy createdAt Descending
 * Firestore will prompt with a link on first query if the index is missing.
 */
const queryRecentSalesFromFirestore = async (
  now = Date.now()
): Promise<RecentSale[]> => {
  const cutoff = getCutoffMs(now);
  const snapshot = await getAdminDb()
    .collection(salesPopupConfig.collection)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .get();

  const sales: RecentSale[] = [];

  for (const doc of snapshot.docs) {
    const data = { id: doc.id, ...doc.data() };
    if (isRecentSale(data)) {
      sales.push(data);
    }
  }

  return sales;
};

const getCachedRecentSales = unstable_cache(
  async (): Promise<CachedRecentSalesSnapshot> => {
    const startedAt = Date.now();
    const sales = await queryRecentSalesFromFirestore();
    const cachedAt = Date.now();

    // This callback only executes when Next.js has no fresh cached value.
    console.info("[Recent Sales] CACHE MISS — Firestore queried", {
      salesCount: sales.length,
      durationMs: cachedAt - startedAt,
      cachedAt: new Date(cachedAt).toISOString(),
      maxAgeDays: salesPopupConfig.maxAgeDays,
    });

    return { sales, cachedAt };
  },
  ["recent-sales-list"],
  {
    revalidate: salesPopupConfig.cacheSeconds,
    tags: [RECENT_SALES_CACHE_TAG],
  }
);

/**
 * Cached recent sales within the configured max-age window.
 * Deduped per-request via React `cache()`.
 */
export const getRecentSales = cache(async (): Promise<RecentSale[]> => {
  if (!salesPopupConfig.enabled) {
    return [];
  }

  try {
    const snapshot = await getCachedRecentSales();
    const cacheAgeMs = Math.max(0, Date.now() - snapshot.cachedAt);

    // Next.js does not expose an exact hit/miss flag. A CACHE MISS log above
    // means Firestore was queried; this log describes the value being served.
    console.info("[Recent Sales] CACHE SERVED", {
      salesCount: snapshot.sales.length,
      cacheAge: formatCacheAge(cacheAgeMs),
      cacheAgeSeconds: Math.floor(cacheAgeMs / 1000),
      cachedAt: new Date(snapshot.cachedAt).toISOString(),
      revalidateSeconds: salesPopupConfig.cacheSeconds,
    });

    return snapshot.sales;
  } catch (error) {
    console.error("[Recent Sales] Failed to load from Firestore", error);
    return [];
  }
});

/**
 * Smart selection for the popup API.
 *
 * - 0 sales → []
 * - < 5 → all, lightly shuffled (avoid always the same order)
 * - 5–50 → shuffle and return up to apiBatchSize
 * - > 50 → weighted random sample preferring newer purchases
 */
export const selectSalesForPopup = (
  sales: RecentSale[],
  now = Date.now()
): RecentSale[] => {
  const count = sales.length;

  if (count === 0) {
    return [];
  }

  const batchSize = salesPopupConfig.apiBatchSize;

  if (count < 5) {
    return shuffle(sales);
  }

  if (count <= 50) {
    return shuffle(sales).slice(0, batchSize);
  }

  return weightedSamplePreferringNewer(sales, batchSize, now);
};

/**
 * Whether the storefront should mount/run the sales popup.
 */
export const shouldShowSalesPopup = (sales: RecentSale[]): boolean =>
  salesPopupConfig.enabled && sales.length > 0;
