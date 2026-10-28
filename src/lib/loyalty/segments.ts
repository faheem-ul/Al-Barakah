export const DEFAULT_LOYALTY_COUPON_CODE = "ABHLOYAL200";
export const DEFAULT_LOYALTY_COUPON_AMOUNT = 200;

/** Matches Shopify Admin segment used for discount eligibility. */
export const LOYALTY_SHOPIFY_SEGMENT_NAME =
  "Customers who have purchased at least once";

export const LOYALTY_MIN_ORDERS = 1;

/** Fallback customer search when segment GID lookup is unavailable (Phase 2). */
export const LOYALTY_CUSTOMERS_SEARCH_QUERY = "orders_count:>=1";

export type LoyaltyCouponConfig = {
  code: string;
  amount: number;
};

export function getLoyaltyCouponConfig(): LoyaltyCouponConfig {
  const code =
    process.env.LOYALTY_COUPON_CODE?.trim() || DEFAULT_LOYALTY_COUPON_CODE;
  const amountRaw = process.env.LOYALTY_COUPON_AMOUNT?.trim();
  const parsed = amountRaw ? Number(amountRaw) : NaN;
  const amount = Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_LOYALTY_COUPON_AMOUNT;

  return { code, amount };
}

export function isLoyaltyEligible(numberOfOrders: number): boolean {
  return numberOfOrders >= LOYALTY_MIN_ORDERS;
}

export function formatLoyaltyAmount(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}
