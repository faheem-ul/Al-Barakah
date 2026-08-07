import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { saveRecentSales } from "@/lib/recent-sales";
import {
  extractRecentSalesFromOrder,
  verifyShopifyWebhookHmac,
  type ShopifyOrderCreatePayload,
} from "@/lib/shopify/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shopify `orders/create` webhook.
 * Verifies HMAC, extracts only public fields, writes one doc per line item.
 */
export const POST = async (request: NextRequest) => {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhookHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = JSON.parse(rawBody) as ShopifyOrderCreatePayload;
    const sales = await extractRecentSalesFromOrder(order);
    const written = await saveRecentSales(sales);

    // Intentionally do not revalidateTag here — hourly cache is required.
    return NextResponse.json({ ok: true, written }, { status: 200 });
  } catch (error) {
    console.error("[Shopify Webhook] orders/create failed", error);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
};
