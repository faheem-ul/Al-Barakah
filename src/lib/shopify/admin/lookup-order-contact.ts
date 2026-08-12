import {
  adminGraphql,
  normalizeOrderNumber,
} from "@/lib/shopify/admin/client";

export type OrderCustomerContact = {
  orderNumber: string;
  orderName: string;
  email: string;
  name: string;
};

type OrderContactNode = {
  id: string;
  name: string;
  email?: string | null;
  customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null;
  shippingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  } | null;
};

async function findOrderContactNode(
  orderNumber: string
): Promise<OrderContactNode | null> {
  const num = normalizeOrderNumber(orderNumber);
  if (!num) return null;

  const query = `
    query FindOrderContact($q: String!) {
      orders(first: 5, query: $q) {
        edges {
          node {
            id
            name
            email
            customer {
              email
              firstName
              lastName
              displayName
            }
            shippingAddress {
              firstName
              lastName
              name
            }
          }
        }
      }
    }
  `;

  const searches = [`name:#${num}`, `name:${num}`, `name:${num}*`];
  for (const q of searches) {
    const data = await adminGraphql<{
      orders: { edges: Array<{ node: OrderContactNode }> };
    }>(query, { q });

    const edges = data.orders?.edges ?? [];
    const exact = edges.find((e) => {
      const name = String(e.node.name || "").replace(/^#/, "");
      return name === num;
    });
    if (exact) return exact.node;
    if (edges.length === 1) return edges[0].node;
  }

  return null;
}

function resolveCustomerName(order: OrderContactNode): string {
  const customer = order.customer;
  const fromCustomer = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromCustomer) return fromCustomer;
  if (customer?.displayName) return String(customer.displayName).trim();

  const shipping = order.shippingAddress;
  if (shipping?.name) return String(shipping.name).trim();
  const fromShip = [shipping?.firstName, shipping?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fromShip;
}

/**
 * Resolve checkout/customer email for an order number (Admin API).
 */
export async function lookupOrderCustomerContact(
  orderNumber: string
): Promise<OrderCustomerContact | null> {
  const order = await findOrderContactNode(orderNumber);
  if (!order) return null;

  const email = String(order.email || order.customer?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return null;

  return {
    orderNumber: normalizeOrderNumber(orderNumber),
    orderName: order.name,
    email,
    name: resolveCustomerName(order) || "Customer",
  };
}
