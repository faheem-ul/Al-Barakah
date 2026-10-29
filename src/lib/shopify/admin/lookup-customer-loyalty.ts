import { adminGraphql } from "@/lib/shopify/admin/client";
import { parseCustomerSpent } from "@/lib/loyalty/segments";

type CustomerLoyaltyQuery = {
  customer: {
    numberOfOrders: number;
    amountSpent: { amount: string };
  } | null;
};

export async function fetchCustomerLoyaltyMetrics(
  customerId: number,
): Promise<{ ordersCount: number; totalSpent: number } | null> {
  if (!customerId) return null;

  try {
    const data = await adminGraphql<CustomerLoyaltyQuery>(
      `query CustomerLoyalty($id: ID!) {
        customer(id: $id) {
          numberOfOrders
          amountSpent { amount }
        }
      }`,
      { id: `gid://shopify/Customer/${customerId}` },
    );

    const customer = data.customer;
    if (!customer) return null;

    return {
      ordersCount: customer.numberOfOrders ?? 0,
      totalSpent: parseCustomerSpent(customer.amountSpent?.amount),
    };
  } catch (err) {
    console.warn("[Shopify Admin] fetchCustomerLoyaltyMetrics failed:", err);
    return null;
  }
}
