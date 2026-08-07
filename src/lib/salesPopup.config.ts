/**
 * Central configuration for the recent-purchase sales popup.
 * Import this everywhere — avoid magic numbers in routes/UI.
 */
export const salesPopupConfig = {
  /** Feature flag — disable to hide popup and short-circuit APIs */
  enabled: true,
  /** Next.js / unstable_cache revalidation window (1 hour) */
  cacheSeconds: 3600,
  /** Only surface purchases from the last N days */
  maxAgeDays: 7,
  /** Delay after page load before the first popup */
  popupDelay: 15_000, 
  /** How long each popup stays visible */
  displayDuration: 10_000,
  /** Min gap between consecutive popups */
  intervalMin: 30_000,
  /** Max gap between consecutive popups (randomized with intervalMin) */
  intervalMax: 45_000,
  /** Cap notifications per visitor session */
  maxPerSession: 5,
  /** Used when shipping/billing city is missing */
  fallbackCity: "Pakistan",
  /** Firestore collection name */
  collection: "recent-sales",
  /** localStorage key for IDs already shown in this browser */
  localStorageKey: "recentlyShownSales",
  /** Max sales returned by the public API after selection */
  apiBatchSize: 10,
  /** Fallback display name when first name is unavailable */
  fallbackFirstName: "Someone",
} as const;

export type SalesPopupConfig = typeof salesPopupConfig;
