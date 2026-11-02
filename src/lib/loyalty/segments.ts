export const LOYALTY_ORDER_TIER_LOW_PKR = 2000;
export const LOYALTY_ORDER_TIER_MID_PKR = 3500;
export const LOYALTY_ORDER_TIER_HIGH_PKR = 5000;

export const LOYALTY_MIN_ORDERS = 1;

/** Fallback customer search when segment GID lookup is unavailable (Phase 2 bulk). */
export const LOYALTY_CUSTOMERS_SEARCH_QUERY = "orders_count:>=1";

export type LoyaltyTierAmount = 150 | 300 | 500;

export type LoyaltyTier = {
  code: string;
  amount: LoyaltyTierAmount;
  minimumPurchasePkr: number;
};

/** Legacy static codes (pre–unique-code flow); not used when Shopify auto-create is on. */
export const LOYALTY_TIERS = {
  t1: { code: "ABHLOYAL150", amount: 150 as const },
  t2: { code: "ABHLOYAL300", amount: 300 as const },
  t3: { code: "ABHLOYAL500", amount: 500 as const },
} as const;

export function minimumPurchasePkrForTier(
  amount: LoyaltyTierAmount,
): number {
  switch (amount) {
    case 150:
      return LOYALTY_ORDER_TIER_LOW_PKR;
    case 300:
      return LOYALTY_ORDER_TIER_MID_PKR;
    case 500:
      return LOYALTY_ORDER_TIER_HIGH_PKR;
    default:
      return LOYALTY_ORDER_TIER_LOW_PKR;
  }
}

export function loyaltyTierWithCode(
  amount: LoyaltyTierAmount,
  code: string,
): LoyaltyTier {
  return {
    code,
    amount,
    minimumPurchasePkr: minimumPurchasePkrForTier(amount),
  };
}

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

/** Paid-order voucher tier from current order total (PKR). */
export function resolveLoyaltyTierFromOrderTotalPkr(
  orderTotalPkr: number,
): LoyaltyTier | null {
  if (orderTotalPkr < LOYALTY_ORDER_TIER_LOW_PKR) {
    return null;
  }
  if (orderTotalPkr >= LOYALTY_ORDER_TIER_HIGH_PKR) {
    return loyaltyTierWithCode(LOYALTY_TIERS.t3.amount, LOYALTY_TIERS.t3.code);
  }
  if (orderTotalPkr >= LOYALTY_ORDER_TIER_MID_PKR) {
    return loyaltyTierWithCode(LOYALTY_TIERS.t2.amount, LOYALTY_TIERS.t2.code);
  }
  return loyaltyTierWithCode(LOYALTY_TIERS.t1.amount, LOYALTY_TIERS.t1.code);
}

export function resolveLoyaltyTierAmountFromOrderTotalPkr(
  orderTotalPkr: number,
): LoyaltyTierAmount | null {
  const tier = resolveLoyaltyTierFromOrderTotalPkr(orderTotalPkr);
  return tier?.amount ?? null;
}

/** On by default in production; set LOYALTY_SHOPIFY_AUTO_CREATE=false to disable. */
export function isLoyaltyShopifyAutoCreateEnabled(): boolean {
  const raw = process.env.LOYALTY_SHOPIFY_AUTO_CREATE?.trim().toLowerCase();
  if (raw === "false") return false;
  if (raw === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function isLoyaltyEligible(numberOfOrders: number): boolean {
  return numberOfOrders >= LOYALTY_MIN_ORDERS;
}

export function formatLoyaltyAmount(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}
