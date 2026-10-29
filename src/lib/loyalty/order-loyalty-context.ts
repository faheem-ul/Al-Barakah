import {
  isLoyaltyEligible,
  parseCustomerSpent,
  resolveLoyaltyTierFromLifetimeSpent,
  type LoyaltyTier,
} from "@/lib/loyalty/segments";
import { fetchCustomerLoyaltyMetrics } from "@/lib/shopify/admin/lookup-customer-loyalty";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

export type OrderLoyaltyContext = {
  tier: LoyaltyTier;
  ordersCount: number;
  lifetimeSpentPkr: number;
};

export function isOrderFinanciallyPaid(order: ShopifyWebhookOrder): boolean {
  const fin = String(order.financial_status || "")
    .trim()
    .toLowerCase();
  return fin === "paid";
}

export function shouldTriggerPaidLoyaltyWebhook(
  topic: string,
  order: ShopifyWebhookOrder,
): boolean {
  if (!isOrderFinanciallyPaid(order)) return false;
  if (topic === "orders/paid") return true;
  if (topic === "orders/updated") return true;
  return false;
}

/**
 * Lifetime spend + orders count from webhook customer, with Admin API fallback.
 */
export async function resolveOrderLoyaltyContext(
  order: ShopifyWebhookOrder,
): Promise<OrderLoyaltyContext | null> {
  let ordersCount = order.customer?.orders_count;
  let lifetimeSpentPkr = parseCustomerSpent(order.customer?.total_spent);

  const customerId = order.customer?.id;
  if (
    (ordersCount === undefined || order.customer?.total_spent === undefined) &&
    customerId
  ) {
    const fromAdmin = await fetchCustomerLoyaltyMetrics(customerId);
    if (fromAdmin) {
      ordersCount = fromAdmin.ordersCount;
      lifetimeSpentPkr = fromAdmin.totalSpent;
    }
  }

  const count = ordersCount ?? 0;
  if (!isLoyaltyEligible(count)) {
    return null;
  }

  return {
    tier: resolveLoyaltyTierFromLifetimeSpent(lifetimeSpentPkr),
    ordersCount: count,
    lifetimeSpentPkr,
  };
}
