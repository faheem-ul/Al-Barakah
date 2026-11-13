import "server-only";

import { adminGraphql } from "@/lib/shopify/admin/client";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

const LOG = "[Loyalty Manual Send Orders]";

type GraphqlMoney = {
  shopMoney?: { amount?: string | null; currencyCode?: string | null };
};

/**
 * Non-PII order fields only (no email, addresses, or Customer — Basic plan safe).
 */
export type GraphqlOrderNode = {
  id: string;
  name?: string | null;
  createdAt?: string | null;
  displayFinancialStatus?: string | null;
  totalPriceSet?: GraphqlMoney | null;
  currentTotalPriceSet?: GraphqlMoney | null;
};

const ORDER_FIELDS = `
  id
  name
  createdAt
  displayFinancialStatus
  totalPriceSet {
    shopMoney {
      amount
      currencyCode
    }
  }
  currentTotalPriceSet {
    shopMoney {
      amount
      currencyCode
    }
  }
`;

function parseLegacyId(gidOrId: string | null | undefined): number | undefined {
  if (!gidOrId) return undefined;
  const raw = String(gidOrId).trim();
  const fromGid = raw.match(/(\d+)$/);
  const digits = fromGid?.[1] ?? raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

function orderNumberFromName(name: string | null | undefined): number | undefined {
  const cleaned = String(name || "").trim().replace(/^#+/, "");
  if (!cleaned) return undefined;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : undefined;
}

function mapFinancialStatus(raw: string | null | undefined): string {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "paid") return "paid";
  return value;
}

function orderTotalAmount(node: GraphqlOrderNode): string {
  return (
    node.currentTotalPriceSet?.shopMoney?.amount ??
    node.totalPriceSet?.shopMoney?.amount ??
    "0"
  );
}

export function mapGraphqlOrderToWebhook(
  node: GraphqlOrderNode,
): ShopifyWebhookOrder | null {
  const legacyId = parseLegacyId(node.id);
  if (!legacyId) {
    console.warn(`${LOG} skip order without id`, node.name);
    return null;
  }

  const orderNumber = orderNumberFromName(node.name);

  return {
    id: legacyId,
    name: node.name,
    order_number: orderNumber,
    created_at: node.createdAt,
    financial_status: mapFinancialStatus(node.displayFinancialStatus),
    total_price: orderTotalAmount(node),
    customer: null,
  };
}

function splitCustomerName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/** Merge contact from sheet / admin input (Shopify Admin order fetch is non-PII). */
export function applyManualLoyaltyOrderContact(
  order: ShopifyWebhookOrder,
  contact: {
    email: string;
    shopifyCustomerId?: number | null;
    customerName?: string | null;
    phone?: string | null;
  },
): ShopifyWebhookOrder {
  const email = contact.email.trim();
  const customerId = contact.shopifyCustomerId;
  const fullName = String(contact.customerName || "").trim();
  const phone = String(contact.phone || "").trim();
  const { firstName, lastName } = splitCustomerName(fullName);

  const customer =
    customerId && customerId > 0
      ? {
          id: customerId,
          email,
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          ...(phone ? { phone } : {}),
        }
      : email || firstName
        ? {
            email: email || undefined,
            ...(firstName ? { first_name: firstName } : {}),
            ...(lastName ? { last_name: lastName } : {}),
            ...(phone ? { phone } : {}),
          }
        : null;

  const shipping_address =
    fullName || phone
      ? {
          name: fullName || undefined,
          first_name: firstName || undefined,
          phone: phone || undefined,
        }
      : order.shipping_address;

  return {
    ...order,
    email,
    ...(phone ? { phone } : {}),
    customer,
    shipping_address,
  };
}

export async function fetchPaidOrdersForManualLoyalty(params: {
  limit: number;
  cursor?: string | null;
}): Promise<{
  orders: ShopifyWebhookOrder[];
  /** Edge cursor per order (same index as `orders`) — resume after any order. */
  cursors: string[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = Math.min(Math.max(params.limit, 1), 250);

  const cursor = params.cursor?.trim();
  const variables: Record<string, unknown> = {
    first: limit,
    query: "financial_status:paid",
  };
  if (cursor) {
    variables.after = cursor;
  }

  const queryDoc = cursor
    ? `query PaidOrdersForLoyalty($first: Int!, $after: String!, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            ${ORDER_FIELDS}
          }
        }
      }
    }`
    : `query PaidOrdersForLoyalty($first: Int!, $query: String!) {
      orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            ${ORDER_FIELDS}
          }
        }
      }
    }`;

  const data = await adminGraphql<{
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ cursor: string; node: GraphqlOrderNode }>;
    };
  }>(queryDoc, variables);

  const connection = data.orders;
  const orders: ShopifyWebhookOrder[] = [];
  const cursors: string[] = [];
  for (const edge of connection?.edges ?? []) {
    const mapped = mapGraphqlOrderToWebhook(edge.node);
    if (mapped) {
      orders.push(mapped);
      cursors.push(edge.cursor);
    }
  }

  return {
    orders,
    cursors,
    nextCursor: connection?.pageInfo?.endCursor ?? null,
    hasMore: Boolean(connection?.pageInfo?.hasNextPage),
  };
}

export async function fetchShopifyOrderForManualLoyalty(
  shopifyOrderId: string | number,
): Promise<ShopifyWebhookOrder | null> {
  const legacyId = parseLegacyId(String(shopifyOrderId));
  if (!legacyId) return null;

  const data = await adminGraphql<{ order: GraphqlOrderNode | null }>(
    `query OrderForManualLoyalty($id: ID!) {
      order(id: $id) {
        ${ORDER_FIELDS}
      }
    }`,
    { id: `gid://shopify/Order/${legacyId}` },
  );

  if (!data.order) return null;
  return mapGraphqlOrderToWebhook(data.order);
}
