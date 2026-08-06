import { NextRequest, NextResponse } from "next/server";
import { appendOrderRows } from "@/lib/google/sheets";
import { buildOrderSheetRows } from "@/lib/shopify/orders-to-sheet-rows";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";
import { verifyShopifyWebhookHmac } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TOPICS = new Set(["orders/paid"]);
const LOG = "[Shopify Webhook]";

async function readRawBody(request: NextRequest): Promise<Buffer> {
  // Prefer text() then fall back to arrayBuffer / stream
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

export async function POST(request: NextRequest) {
  console.log(`${LOG} ===== Incoming POST =====`);
  console.log(`${LOG} Time:`, new Date().toISOString());
  console.log(`${LOG} Topic header:`, request.headers.get("x-shopify-topic"));
  console.log(`${LOG} Shop domain:`, request.headers.get("x-shopify-shop-domain"));
  console.log(
    `${LOG} Webhook ID:`,
    request.headers.get("x-shopify-webhook-id")
  );
  console.log(
    `${LOG} Content-Type:`,
    request.headers.get("content-type")
  );
  console.log(
    `${LOG} Content-Length header:`,
    request.headers.get("content-length")
  );
  console.log(
    `${LOG} Transfer-Encoding:`,
    request.headers.get("transfer-encoding")
  );
  console.log(
    `${LOG} HMAC present:`,
    Boolean(request.headers.get("x-shopify-hmac-sha256"))
  );

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(`${LOG} SHOPIFY_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }
  console.log(`${LOG} Webhook secret loaded (length ${secret.length})`);

  const rawBody = await readRawBody(request);
  console.log(`${LOG} Body bytes:`, rawBody.length);

  if (rawBody.length === 0) {
    console.error(
      `${LOG} EMPTY BODY — Shopify signed a payload but we received 0 bytes.`
    );
    console.error(
      `${LOG} Usual causes: Dev Tunnel stripping POST bodies, or first request during route compile.`
    );
    console.error(
      `${LOG} Fix: use ngrok (https://ngrok.com) → ngrok http 3000, update Shopify webhook URL, restart with: next dev (no turbopack).`
    );
    // 503 so Shopify retries after tunnel/server is ready
    return NextResponse.json(
      { error: "Empty webhook body" },
      { status: 503 }
    );
  }

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const hmacOk = verifyShopifyWebhookHmac(rawBody, hmacHeader, secret);
  console.log(`${LOG} HMAC verification:`, hmacOk ? "PASSED" : "FAILED");

  if (!hmacOk) {
    console.error(`${LOG} Rejecting request — invalid HMAC (check SHOPIFY_WEBHOOK_SECRET)`);
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  if (!topic || !ALLOWED_TOPICS.has(topic)) {
    console.log(`${LOG} Skipping topic (not orders/paid):`, topic);
    return NextResponse.json({ ok: true, skipped: true, topic });
  }
  console.log(`${LOG} Topic allowed:`, topic);

  let order: ShopifyWebhookOrder;
  try {
    order = JSON.parse(rawBody.toString("utf8")) as ShopifyWebhookOrder;
  } catch (error) {
    console.error(`${LOG} Failed to parse JSON body:`, error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!order?.id) {
    console.error(`${LOG} Payload missing order id`);
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  console.log(`${LOG} Order summary:`, {
    id: order.id,
    name: order.name,
    order_number: order.order_number,
    email: order.email ?? order.customer?.email,
    financial_status: order.financial_status,
    total_price: order.total_price,
    currency: order.currency,
    line_items: order.line_items?.length ?? 0,
  });

  try {
    const rows = buildOrderSheetRows(order);
    console.log(`${LOG} Built ${rows.length} sheet row(s)`);
    console.log(`${LOG} Writing to Google Sheets...`);

    const result = await appendOrderRows(rows, order.id);

    if (result.skipped) {
      console.log(
        `${LOG} SKIPPED write for order ${order.id} — reason: ${result.reason}`
      );
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
      });
    }

    console.log(
      `${LOG} SUCCESS — wrote ${result.rows ?? rows.length} row(s) to Google Sheets`
    );
    return NextResponse.json({ ok: true, rows: result.rows ?? rows.length });
  } catch (error) {
    console.error(`${LOG} FAILED to write order to Google Sheets:`, error);
    return NextResponse.json(
      { error: "Failed to write to Google Sheets" },
      { status: 500 }
    );
  }
}
