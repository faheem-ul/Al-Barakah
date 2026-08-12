import { NextRequest, NextResponse } from "next/server";
import { markOrderDeliveredInShopify } from "@/lib/shopify/admin/mark-delivered";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[mark-delivered]";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST { orderNumber, trackingNumber } with header x-sync-secret to mark Shopify order paid + fulfilled.",
  });
}

export async function POST(request: NextRequest) {
  const expected = process.env.SHEET_TO_SHOPIFY_SYNC_SECRET?.trim();
  if (!expected) {
    console.error(`${LOG} SHEET_TO_SHOPIFY_SYNC_SECRET not configured`);
    return NextResponse.json(
      { error: "Sync secret not configured" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-sync-secret") || "";
  if (!timingSafeEqual(provided, expected)) {
    console.warn(`${LOG} Invalid sync secret`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderNumber?: string; trackingNumber?: string };
  try {
    body = (await request.json()) as {
      orderNumber?: string;
      trackingNumber?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber || "").trim();
  const trackingNumber = String(body.trackingNumber || "").trim();

  console.log(`${LOG} Request`, { orderNumber, trackingNumber });

  try {
    const result = await markOrderDeliveredInShopify({
      orderNumber,
      trackingNumber,
    });
    console.log(`${LOG} Result`, result);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 422,
    });
  } catch (error) {
    console.error(`${LOG} FAILED`, error);
    return NextResponse.json(
      {
        ok: false,
        paid: false,
        fulfilled: false,
        skipped: false,
        reason: "exception",
        errors: [error instanceof Error ? error.message : String(error)],
      },
      { status: 500 }
    );
  }
}
