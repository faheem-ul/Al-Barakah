export const LOYALTY_SPEND_MID_PKR = 2500;
export const LOYALTY_SPEND_HIGH_PKR = 5000;

export const LOYALTY_MIN_ORDERS = 1;

/** Fallback customer search when segment GID lookup is unavailable (Phase 2 bulk). */
export const LOYALTY_CUSTOMERS_SEARCH_QUERY = "orders_count:>=1";

export type LoyaltyTier = {
  code: string;
  amount: number;
};

export const LOYALTY_TIERS = {
  t1: { code: "ABHLOYAL150", amount: 150 },
  t2: { code: "ABHLOYAL300", amount: 300 },
  t3: { code: "ABHLOYAL500", amount: 500 },
} as const;

export function parseCustomerSpent(
  raw: string | number | null | undefined,
): number {
  if (raw === null || raw === undefined) return 0;
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Matches Shopify customer segments (lifetime amount spent, PKR). */
export function resolveLoyaltyTierFromLifetimeSpent(
  spentPkr: number,
): LoyaltyTier {
  if (spentPkr >= LOYALTY_SPEND_HIGH_PKR) {
    return { ...LOYALTY_TIERS.t3 };
  }
  if (spentPkr >= LOYALTY_SPEND_MID_PKR) {
    return { ...LOYALTY_TIERS.t2 };
  }
  return { ...LOYALTY_TIERS.t1 };
}

export function isLoyaltyEligible(numberOfOrders: number): boolean {
  return numberOfOrders >= LOYALTY_MIN_ORDERS;
}

export function formatLoyaltyAmount(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}
