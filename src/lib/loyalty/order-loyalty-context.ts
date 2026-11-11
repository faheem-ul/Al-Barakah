import {
  isLoyaltyEligible,
  parseCustomerSpent,
  resolveLoyaltyTierFromOrderTotalPkr,
  type LoyaltyTier,
} from "@/lib/loyalty/segments";
import { fetchCustomerLoyaltyMetrics } from "@/lib/shopify/admin/lookup-customer-loyalty";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

export type OrderLoyaltyContext = {
  tier: LoyaltyTier;
  ordersCount: number;
  orderTotalPkr: number;
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
 * Current order total + orders count from webhook, with Admin fallback for count only.
 */
export async function resolveOrderLoyaltyContext(
  order: ShopifyWebhookOrder,
): Promise<OrderLoyaltyContext | null> {
  let ordersCount = order.customer?.orders_count;
  const orderTotalPkr = parseCustomerSpent(order.total_price);

  const customerId = order.customer?.id;
  if (ordersCount === undefined && customerId) {
    const fromAdmin = await fetchCustomerLoyaltyMetrics(customerId);
    if (fromAdmin) {
      ordersCount = fromAdmin.ordersCount;
    }
  }

  const count = ordersCount ?? 0;
  if (!isLoyaltyEligible(count)) {
    return null;
  }

  const tier = resolveLoyaltyTierFromOrderTotalPkr(orderTotalPkr);
  if (!tier) {
    return null;
  }

  return {
    tier,
    ordersCount: count,
    orderTotalPkr,
  };
}

/**
 * Admin manual send: paid order + tier from total only (no returning-customer check).
 */
export function resolveManualLoyaltyContext(
  order: ShopifyWebhookOrder,
): OrderLoyaltyContext | null {
  if (!isOrderFinanciallyPaid(order)) {
    return null;
  }

  const orderTotalPkr = parseCustomerSpent(order.total_price);
  const tier = resolveLoyaltyTierFromOrderTotalPkr(orderTotalPkr);
  if (!tier) {
    return null;
  }

  return {
    tier,
    ordersCount: order.customer?.orders_count ?? 0,
    orderTotalPkr,
  };
}

export function manualLoyaltyIneligibleReason(
  order: ShopifyWebhookOrder,
): string | null {
  if (!isOrderFinanciallyPaid(order)) {
    return "Order is not paid";
  }
  const orderTotalPkr = parseCustomerSpent(order.total_price);
  if (!resolveLoyaltyTierFromOrderTotalPkr(orderTotalPkr)) {
    return "Order total below minimum for a loyalty tier (Rs 2,000)";
  }
  return null;
}
