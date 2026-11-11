import { adminGraphql } from "@/lib/shopify/admin/client";

import type { ShopifyCustomerContact } from "@/lib/shopify/admin/lookup-customer-by-email";

const LOG = "[Shopify Admin lookup-customer-by-id]";

type CustomerByIdData = {
  customer: {
    id: string;
    legacyResourceId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
};

export async function findShopifyCustomerContactById(
  customerId: number,
): Promise<ShopifyCustomerContact | null> {
  if (!Number.isFinite(customerId) || customerId <= 0) return null;

  const query = `
    query LoyaltyCustomerById($id: ID!) {
      customer(id: $id) {
        id
        legacyResourceId
        firstName
        lastName
        phone
      }
    }
  `;

  try {
    const data = await adminGraphql<CustomerByIdData>(query, {
      id: `gid://shopify/Customer/${customerId}`,
    });
    const node = data.customer;
    if (!node) return null;

    const id = Number(node.legacyResourceId || customerId);
    if (!Number.isFinite(id) || id <= 0) return null;

    return {
      id,
      firstName: node.firstName?.trim() || undefined,
      lastName: node.lastName?.trim() || undefined,
      phone: node.phone?.trim() || undefined,
    };
  } catch (err) {
    console.warn(`${LOG} lookup failed:`, err);
    return null;
  }
}
