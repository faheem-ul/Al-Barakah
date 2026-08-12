import {
  adminGraphql,
  normalizeOrderNumber,
} from "@/lib/shopify/admin/client";

const LOG = "[Shopify Admin]";

export type MarkDeliveredResult = {
  ok: boolean;
  orderId?: string;
  orderName?: string;
  paid: boolean;
  fulfilled: boolean;
  skipped: boolean;
  reason?: string;
  errors?: string[];
};

type OrderNode = {
  id: string;
  name: string;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  canMarkAsPaid?: boolean | null;
  fulfillmentOrders: {
    edges: Array<{
      node: {
        id: string;
        status: string;
      };
    }>;
  };
};

async function findOrderByNumber(
  orderNumber: string
): Promise<OrderNode | null> {
  const num = normalizeOrderNumber(orderNumber);
  if (!num) return null;

  // Prefer exact name match (#1076), then bare number.
  const query = `
    query FindOrder($q: String!) {
      orders(first: 5, query: $q) {
        edges {
          node {
            id
            name
            displayFinancialStatus
            displayFulfillmentStatus
            canMarkAsPaid
            fulfillmentOrders(first: 10) {
              edges {
                node {
                  id
                  status
                }
              }
            }
          }
        }
      }
    }
  `;

  const searches = [`name:#${num}`, `name:${num}`, `name:${num}*`];
  for (const q of searches) {
    const data = await adminGraphql<{
      orders: { edges: Array<{ node: OrderNode }> };
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

async function markOrderPaid(orderId: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const mutation = `
    mutation MarkPaid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order { id displayFinancialStatus }
        userErrors { field message }
      }
    }
  `;
  const data = await adminGraphql<{
    orderMarkAsPaid: {
      order?: { id: string; displayFinancialStatus?: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(mutation, { input: { id: orderId } });

  const errors =
    data.orderMarkAsPaid?.userErrors?.map((e) => e.message).filter(Boolean) ??
    [];
  return { ok: errors.length === 0, errors };
}

async function fulfillOrderWithTracking(
  order: OrderNode,
  trackingNumber: string
): Promise<{ ok: boolean; errors: string[] }> {
  const openStatuses = new Set([
    "OPEN",
    "IN_PROGRESS",
    "SCHEDULED",
    "ON_HOLD",
  ]);
  const fulfillmentOrderIds = (order.fulfillmentOrders?.edges ?? [])
    .map((e) => e.node)
    .filter((n) => openStatuses.has(String(n.status || "").toUpperCase()))
    .map((n) => n.id);

  if (!fulfillmentOrderIds.length) {
    return {
      ok: false,
      errors: ["No open fulfillment orders to fulfill"],
    };
  }

  const cn = trackingNumber.replace(/\D/g, "") || trackingNumber.trim();
  const trackingUrl = `https://www.mulphilog.com/tracking/${cn}`;

  const mutation = `
    mutation CreateFulfillment($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment { id status }
        userErrors { field message }
      }
    }
  `;

  const data = await adminGraphql<{
    fulfillmentCreate: {
      fulfillment?: { id: string; status?: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(mutation, {
    fulfillment: {
      notifyCustomer: true,
      trackingInfo: {
        company: "Other",
        number: cn,
        url: trackingUrl,
      },
      lineItemsByFulfillmentOrder: fulfillmentOrderIds.map((id) => ({
        fulfillmentOrderId: id,
      })),
    },
  });

  const errors =
    data.fulfillmentCreate?.userErrors?.map((e) => e.message).filter(Boolean) ??
    [];
  return {
    ok:
      errors.length === 0 && Boolean(data.fulfillmentCreate?.fulfillment),
    errors,
  };
}

function isPaidStatus(status?: string | null): boolean {
  const s = String(status || "").toUpperCase();
  return (
    s === "PAID" ||
    s === "PARTIALLY_PAID" ||
    s === "REFUNDED" ||
    s === "PARTIALLY_REFUNDED"
  );
}

function isFulfilledStatus(status?: string | null): boolean {
  const s = String(status || "").toUpperCase();
  return s === "FULFILLED";
}

/**
 * When sheet tracking becomes Delivered: mark COD/unpaid as paid + fulfill with CN.
 */
export async function markOrderDeliveredInShopify(input: {
  orderNumber: string;
  trackingNumber: string;
}): Promise<MarkDeliveredResult> {
  const orderNumber = normalizeOrderNumber(input.orderNumber);
  const trackingNumber = String(input.trackingNumber || "").trim();

  if (!orderNumber) {
    return {
      ok: true,
      paid: false,
      fulfilled: false,
      skipped: true,
      reason: "missing_order_number",
    };
  }
  if (!trackingNumber || trackingNumber.replace(/\D/g, "").length < 7) {
    return {
      ok: true,
      paid: false,
      fulfilled: false,
      skipped: true,
      reason: "missing_tracking_number",
    };
  }

  console.log(`${LOG} mark delivered`, { orderNumber, trackingNumber });

  const order = await findOrderByNumber(orderNumber);
  if (!order) {
    return {
      ok: false,
      paid: false,
      fulfilled: false,
      skipped: false,
      reason: "order_not_found",
      errors: [`No Shopify order found for #${orderNumber}`],
    };
  }

  const alreadyPaid = isPaidStatus(order.displayFinancialStatus);
  const alreadyFulfilled = isFulfilledStatus(order.displayFulfillmentStatus);

  if (alreadyPaid && alreadyFulfilled) {
    return {
      ok: true,
      orderId: order.id,
      orderName: order.name,
      paid: false,
      fulfilled: false,
      skipped: true,
      reason: "already_paid_and_fulfilled",
    };
  }

  let paid = false;
  let fulfilled = false;
  const errors: string[] = [];

  if (!alreadyPaid) {
    if (order.canMarkAsPaid === false) {
      errors.push(
        `Order ${order.name} cannot be marked as paid (status: ${order.displayFinancialStatus})`
      );
    } else {
      const mark = await markOrderPaid(order.id);
      paid = mark.ok;
      if (!mark.ok) errors.push(...mark.errors);
      else console.log(`${LOG} Marked paid:`, order.name);
    }
  }

  if (!alreadyFulfilled) {
    // Re-fetch fulfillment orders after possible pay (status may unlock)
    const refreshed = (await findOrderByNumber(orderNumber)) || order;
    if (isFulfilledStatus(refreshed.displayFulfillmentStatus)) {
      fulfilled = false;
    } else {
      const ship = await fulfillOrderWithTracking(refreshed, trackingNumber);
      fulfilled = ship.ok;
      if (!ship.ok) errors.push(...ship.errors);
      else console.log(`${LOG} Fulfilled:`, order.name, trackingNumber);
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    orderId: order.id,
    orderName: order.name,
    paid,
    fulfilled,
    skipped: !paid && !fulfilled && ok,
    reason: ok
      ? paid || fulfilled
        ? "updated"
        : "noop"
      : "partial_or_failed",
    errors: errors.length ? errors : undefined,
  };
}
