import { adminGraphql } from "@/lib/shopify/admin/client";

const LOG = "[Shopify Admin lookup-customer-by-email]";

export type ShopifyCustomerContact = {
  id: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type CustomersSearchData = {
  customers: {
    edges: Array<{
      node: {
        id: string;
        legacyResourceId?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
      };
    }>;
  };
};

function parseCustomerIdFromNode(node: {
  id: string;
  legacyResourceId?: string | null;
}): number | null {
  if (node.legacyResourceId) {
    const n = Number(node.legacyResourceId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const gidMatch = node.id.match(/Customer\/(\d+)$/);
  if (gidMatch) {
    const n = Number(gidMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function findShopifyCustomerContactByEmail(
  email: string,
): Promise<ShopifyCustomerContact | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  const escaped = normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const query = `
    query LoyaltyCustomerByEmail($q: String!) {
      customers(first: 1, query: $q) {
        edges {
          node {
            id
            legacyResourceId
            firstName
            lastName
            phone
          }
        }
      }
    }
  `;

  try {
    const data = await adminGraphql<CustomersSearchData>(query, {
      q: `email:${escaped}`,
    });
    const node = data.customers.edges[0]?.node;
    if (!node) return null;

    const id = parseCustomerIdFromNode(node);
    if (!id) return null;

    return {
      id,
      firstName: node.firstName?.trim() || undefined,
      lastName: node.lastName?.trim() || undefined,
      phone: node.phone?.trim() || undefined,
    };
  } catch (err) {
    console.warn(`${LOG} search failed:`, err);
    return null;
  }
}

/**
 * Numeric Shopify customer id for Admin discount customerSelection.
 */
export async function findShopifyCustomerIdByEmail(
  email: string,
): Promise<number | null> {
  const contact = await findShopifyCustomerContactByEmail(email);
  return contact?.id ?? null;
}
