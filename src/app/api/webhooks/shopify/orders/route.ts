import { NextRequest, NextResponse } from "next/server";
import { notifyAdminLoyaltyCoupon } from "@/lib/email/loyalty-coupon-admin";
import { notifyAdminNewOrder } from "@/lib/email/new-order-admin";
import { notifyCustomerLoyaltyCoupon } from "@/lib/email/loyalty-coupon-customer";
import { notifyCustomerNewOrder } from "@/lib/email/new-order-customer";
import { appendOrderRows, updateOrderStatuses } from "@/lib/google/sheets";
import {
  resolveOrderLoyaltyContext,
  shouldTriggerPaidLoyaltyWebhook,
} from "@/lib/loyalty/order-loyalty-context";
import { resolveOrderProductDetails } from "@/lib/shopify/line-item-detail";
import {
  buildOrderSheetRows,
  initialOrderStatus,
} from "@/lib/shopify/orders-to-sheet-rows";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";
import { verifyShopifyWebhookHmac } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** create = new row; updated/paid = sync Shopify statuses (or insert if missing) */
const CREATE_TOPICS = new Set(["orders/create"]);
const UPDATE_TOPICS = new Set([
  "orders/updated",
  "orders/paid",
  "orders/partially_fulfilled",
  "orders/fulfilled",
  "orders/cancelled",
]);
const ALLOWED_TOPICS = new Set([...CREATE_TOPICS, ...UPDATE_TOPICS]);

const LOG = "[Shopify Webhook]";

/** One admin/customer new-order email per order number per process (webhook retries / races). */
const adminEmailedOrderKeys = new Set<string>();
const customerEmailedOrderKeys = new Set<string>();
const loyaltyEmailedOrderKeys = new Set<string>();

function claimNewOrderAdminEmail_(orderNumber: string): boolean {
  const key = String(orderNumber).trim();
  if (!key) return false;
  if (adminEmailedOrderKeys.has(key)) return false;
  adminEmailedOrderKeys.add(key);
  return true;
}

function claimNewOrderCustomerEmail_(orderNumber: string): boolean {
  const key = String(orderNumber).trim();
  if (!key) return false;
  if (customerEmailedOrderKeys.has(key)) return false;
  customerEmailedOrderKeys.add(key);
  return true;
}

function claimNewOrderLoyaltyEmail_(orderNumber: string): boolean {
  const key = String(orderNumber).trim();
  if (!key) return false;
  if (loyaltyEmailedOrderKeys.has(key)) return false;
  loyaltyEmailedOrderKeys.add(key);
  return true;
}

function releaseLoyaltyEmailClaim(orderNumber: string): void {
  loyaltyEmailedOrderKeys.delete(String(orderNumber).trim());
}

/** Allow Shopify webhook retry when loyalty did not actually complete. */
function shouldReleaseLoyaltyClaimOnSkip(
  skipReason: string | undefined,
): boolean {
  if (!skipReason) return true;
  if (skipReason === "already_sent") return false;
  return true;
}

async function readRawBody(request: NextRequest): Promise<Buffer> {
  try {
    const text = await request.text();
    if (text.length > 0) return Buffer.from(text, "utf8");
  } catch (error) {
    console.warn(`${LOG} request.text() failed:`, error);
  }

  try {
    const ab = await request.arrayBuffer();
    if (ab.byteLength > 0) return Buffer.from(ab);
  } catch (error) {
    console.warn(`${LOG} request.arrayBuffer() failed:`, error);
  }

  return Buffer.alloc(0);
}

/** Warm-up / health check — open this URL once after starting the server so the route is compiled before Shopify posts. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Shopify orders webhook ready. Point Order creation/payment/update webhooks here (POST).",
  });
}

async function sendNewOrderEmailsSafe(
  order: ShopifyWebhookOrder,
  orderNumber: string,
  reason: string,
  productDetails: string[],
) {
  if (claimNewOrderAdminEmail_(orderNumber)) {
    try {
      await notifyAdminNewOrder(order, productDetails);
    } catch (err) {
      adminEmailedOrderKeys.delete(String(orderNumber).trim());
      console.error(`${LOG} Admin new-order email failed:`, err);
    }
  } else {
    console.log(
      `${LOG} Admin email skipped — already sent for order ${orderNumber} (${reason})`,
    );
  }

  if (claimNewOrderCustomerEmail_(orderNumber)) {
    try {
      const result = await notifyCustomerNewOrder(order, productDetails);
      if (result.skipped) {
        console.log(
          `${LOG} Customer email skipped for order ${orderNumber} (${reason})`,
        );
      }
    } catch (err) {
      customerEmailedOrderKeys.delete(String(orderNumber).trim());
      console.error(`${LOG} Customer new-order email failed:`, err);
    }
  } else {
    console.log(
      `${LOG} Customer email skipped — already sent for order ${orderNumber} (${reason})`,
    );
  }
}

async function sendPaidLoyaltyEmailsSafe(
  order: ShopifyWebhookOrder,
  orderNumber: string,
  topic: string,
) {
  if (!shouldTriggerPaidLoyaltyWebhook(topic, order)) {
    return;
  }

  const ctx = await resolveOrderLoyaltyContext(order);
  if (!ctx) {
    console.log(
      `${LOG} Loyalty skipped for order ${orderNumber} — not eligible, order total below tier minimum, or missing customer metrics`,
    );
    return;
  }

  if (!claimNewOrderLoyaltyEmail_(orderNumber)) {
    console.log(
      `${LOG} Loyalty emails skipped — already sent for order ${orderNumber} (${topic})`,
    );
    return;
  }

  let customerResult;
  try {
    customerResult = await notifyCustomerLoyaltyCoupon(order, ctx);
    if (customerResult.skipped) {
      console.log(
        `${LOG} Customer loyalty email skipped for order ${orderNumber}` +
          (customerResult.skipReason
            ? ` (${customerResult.skipReason})`
            : ""),
      );
    } else {
      const code =
        customerResult.tier?.code ?? ctx.tier.code;
      console.log(
        `${LOG} Customer loyalty email sent for order ${orderNumber} — ${code}`,
      );
    }
  } catch (err) {
    releaseLoyaltyEmailClaim(orderNumber);
    console.error(`${LOG} Customer loyalty email failed:`, err);
    return;
  }

  if (customerResult.skipped) {
    if (shouldReleaseLoyaltyClaimOnSkip(customerResult.skipReason)) {
      releaseLoyaltyEmailClaim(orderNumber);
    }
  }

  if (
    customerResult.skipReason === "already_sent" ||
    customerResult.skipReason === "shopify_auto_create_disabled" ||
    customerResult.skipReason === "no_shopify_customer" ||
    customerResult.skipReason === "shopify_discount_failed"
  ) {
    if (customerResult.skipReason === "already_sent") {
      console.log(
        `${LOG} Admin loyalty email skipped for order ${orderNumber} — voucher already sent for this order`,
      );
    }
    return;
  }

  const adminCtx = customerResult.tier
    ? { ...ctx, tier: customerResult.tier }
    : ctx;

  try {
    await notifyAdminLoyaltyCoupon(order, adminCtx);
    const code = adminCtx.tier.code;
    console.log(
      `${LOG} Admin loyalty email sent for order ${orderNumber} — ${code}`,
    );
  } catch (err) {
    console.error(`${LOG} Admin loyalty email failed:`, err);
  }
}

export async function POST(request: NextRequest) {
  console.log(`${LOG} ===== Incoming POST =====`);
  console.log(`${LOG} Time:`, new Date().toISOString());
  console.log(`${LOG} Topic header:`, request.headers.get("x-shopify-topic"));
  console.log(`${LOG} Shop domain:`, request.headers.get("x-shopify-shop-domain"));
  console.log(
    `${LOG} Webhook ID:`,
    request.headers.get("x-shopify-webhook-id"),
  );

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(`${LOG} SHOPIFY_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const rawBody = await readRawBody(request);
  const contentLength = request.headers.get("content-length");
  console.log(`${LOG} Body bytes:`, rawBody.length);
  console.log(`${LOG} Content-Length header:`, contentLength);

  if (rawBody.length === 0) {
    console.error(
      `${LOG} EMPTY BODY — nothing written to Google Sheets. Shopify may have sent a body that was dropped during Turbopack compile / tunnel.`,
    );
    console.error(
      `${LOG} Fix: stop server → run "pnpm run dev:webhook" (no turbopack) → open /api/webhooks/shopify/orders in browser once to warm route → place order again.`,
    );
    return NextResponse.json({ error: "Empty webhook body" }, { status: 503 });
  }

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const hmacOk = verifyShopifyWebhookHmac(rawBody, hmacHeader, secret);
  console.log(`${LOG} HMAC verification:`, hmacOk ? "PASSED" : "FAILED");

  if (!hmacOk) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") || "";
  if (!ALLOWED_TOPICS.has(topic)) {
    console.log(`${LOG} Skipping topic:`, topic);
    return NextResponse.json({ ok: true, skipped: true, topic });
  }
  console.log(`${LOG} Topic allowed:`, topic);

  let order: ShopifyWebhookOrder;
  try {
    order = JSON.parse(rawBody.toString("utf8")) as ShopifyWebhookOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!order?.id) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  const orderNumber = String(order.order_number ?? order.name ?? order.id);
  console.log(`${LOG} Order summary:`, {
    id: order.id,
    order_number: orderNumber,
    email: order.email ?? order.customer?.email,
    financial_status: order.financial_status,
    line_items: order.line_items?.length ?? 0,
    topic,
  });

  if (CREATE_TOPICS.has(topic)) {
    let createBody: Record<string, unknown> = { ok: true, action: "create" };
    try {
      const productDetails = await resolveOrderProductDetails(order.line_items);
      const rows = buildOrderSheetRows(order, productDetails);
      console.log(`${LOG} CREATE — writing ${rows.length} row(s)...`);
      console.log(
        `${LOG} Product Detail preview:`,
        rows.map((row) => ({
          detail: String(row[7] ?? "").slice(0, 120),
          bottleSize: row[8],
          qty: row[9],
        })),
      );
      const result = await appendOrderRows(rows, orderNumber);
      console.log(`${LOG} CREATE result:`, result);
      createBody = { ok: true, action: "create", ...result };
      if (result.written) {
        await sendNewOrderEmailsSafe(
          order,
          orderNumber,
          "orders/create",
          productDetails,
        );
      } else {
        console.log(
          `${LOG} New-order emails skipped on create — sheet:`,
          result.reason || result,
        );
      }
    } catch (error) {
      console.error(`${LOG} FAILED sheet sync on create:`, error);
      createBody = {
        ok: false,
        action: "create",
        sheetError:
          error instanceof Error ? error.message : "Sheet sync failed",
      };
    }

    try {
      await sendPaidLoyaltyEmailsSafe(order, orderNumber, topic);
    } catch (error) {
      console.error(`${LOG} Loyalty failed on create (sheet independent):`, error);
      createBody.loyaltyError =
        error instanceof Error ? error.message : "Loyalty failed";
    }

    const createFailed =
      Boolean(createBody.sheetError) && Boolean(createBody.loyaltyError);
    return NextResponse.json(createBody, { status: createFailed ? 500 : 200 });
  }

  let responseBody: Record<string, unknown> = {
    ok: true,
    action: "update",
  };

  try {
    const orderStatus = initialOrderStatus(order);
    console.log(
      `${LOG} UPDATE — syncing Order Status for order ${orderNumber}:`,
      orderStatus,
    );
    const updated = await updateOrderStatuses(orderNumber, orderStatus);

    if (updated.updated) {
      console.log(`${LOG} UPDATE SUCCESS:`, updated);
      responseBody = { ok: true, action: "update", ...updated };
    } else if (updated.reason === "not_found") {
      console.log(`${LOG} Order not in sheet yet — inserting on update webhook`);
      const productDetails = await resolveOrderProductDetails(order.line_items);
      const rows = buildOrderSheetRows(order, productDetails);
      const created = await appendOrderRows(rows, orderNumber);
      if (created.written) {
        await sendNewOrderEmailsSafe(
          order,
          orderNumber,
          "create_on_update",
          productDetails,
        );
      } else {
        console.log(
          `${LOG} New-order emails skipped on update-insert — sheet:`,
          created.reason || created,
        );
      }
      responseBody = { ok: true, action: "create_on_update", ...created };
    } else {
      console.log(`${LOG} UPDATE skipped:`, updated);
      responseBody = { ok: true, action: "update", ...updated };
    }
  } catch (error) {
    console.error(`${LOG} FAILED sheet sync on update:`, error);
    responseBody = {
      ok: false,
      action: "update",
      sheetError:
        error instanceof Error ? error.message : "Sheet sync failed",
    };
  }

  try {
    await sendPaidLoyaltyEmailsSafe(order, orderNumber, topic);
  } catch (error) {
    console.error(`${LOG} Loyalty failed on update (sheet independent):`, error);
    responseBody.loyaltyError =
      error instanceof Error ? error.message : "Loyalty failed";
  }

  const updateFailed =
    Boolean(responseBody.sheetError) && Boolean(responseBody.loyaltyError);
  return NextResponse.json(responseBody, { status: updateFailed ? 500 : 200 });
}
