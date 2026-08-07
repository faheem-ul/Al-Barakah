import { NextRequest, NextResponse } from "next/server";
import { appendOrderRows, updateOrderStatuses } from "@/lib/google/sheets";
import { buildOrderSheetRows } from "@/lib/shopify/orders-to-sheet-rows";
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

export async function POST(request: NextRequest) {
  console.log(`${LOG} ===== Incoming POST =====`);
  console.log(`${LOG} Time:`, new Date().toISOString());
  console.log(`${LOG} Topic header:`, request.headers.get("x-shopify-topic"));
  console.log(`${LOG} Shop domain:`, request.headers.get("x-shopify-shop-domain"));
  console.log(
    `${LOG} Webhook ID:`,
    request.headers.get("x-shopify-webhook-id")
  );

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(`${LOG} SHOPIFY_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const rawBody = await readRawBody(request);
  const contentLength = request.headers.get("content-length");
  console.log(`${LOG} Body bytes:`, rawBody.length);
  console.log(`${LOG} Content-Length header:`, contentLength);

  if (rawBody.length === 0) {
    console.error(
      `${LOG} EMPTY BODY — nothing written to Google Sheets. Shopify may have sent a body that was dropped during Turbopack compile / tunnel.`
    );
    console.error(
      `${LOG} Fix: stop server → run "pnpm run dev:webhook" (no turbopack) → open /api/webhooks/shopify/orders in browser once to warm route → place order again.`
    );
    // Non-2xx so Shopify retries with the body
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

  try {
    if (CREATE_TOPICS.has(topic)) {
      const rows = buildOrderSheetRows(order);
      console.log(`${LOG} CREATE — writing ${rows.length} row(s)...`);
      const result = await appendOrderRows(rows, orderNumber);
      console.log(`${LOG} CREATE result:`, result);
      return NextResponse.json({ ok: true, action: "create", ...result });
    }

    // Update path: sync financial status; if order not in sheet yet, insert it
    console.log(`${LOG} UPDATE — syncing Financial Status for order ${orderNumber}...`);
    const updated = await updateOrderStatuses(
      orderNumber,
      String(order.financial_status ?? "")
    );

    if (updated.updated) {
      console.log(`${LOG} UPDATE SUCCESS:`, updated);
      return NextResponse.json({ ok: true, action: "update", ...updated });
    }

    if (updated.reason === "not_found") {
      console.log(`${LOG} Order not in sheet yet — inserting on update webhook`);
      const rows = buildOrderSheetRows(order);
      const created = await appendOrderRows(rows, orderNumber);
      return NextResponse.json({
        ok: true,
        action: "create_on_update",
        ...created,
      });
    }

    console.log(`${LOG} UPDATE skipped:`, updated);
    return NextResponse.json({ ok: true, action: "update", ...updated });
  } catch (error) {
    console.error(`${LOG} FAILED sheet sync:`, error);
    return NextResponse.json(
      { error: "Failed to write to Google Sheets" },
      { status: 500 }
    );
  }
}
