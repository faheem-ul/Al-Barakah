import { NextRequest, NextResponse } from "next/server";
import { lookupOrderCustomerContact } from "@/lib/shopify/admin/lookup-order-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[customer-contact]";

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
      "POST { orderNumber } with header x-sync-secret to look up customer email from Shopify Admin.",
  });
}

export async function POST(request: NextRequest) {
  const expected = process.env.SHEET_TO_SHOPIFY_SYNC_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Sync secret not configured" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-sync-secret") || "";
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderNumber?: string };
  try {
    body = (await request.json()) as { orderNumber?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber || "").trim();
  if (!orderNumber) {
    return NextResponse.json(
      { ok: false, reason: "missing_order_number" },
      { status: 400 }
    );
  }

  try {
    const contact = await lookupOrderCustomerContact(orderNumber);
    if (!contact) {
      console.log(`${LOG} No email for order`, orderNumber);
      return NextResponse.json({
        ok: false,
        reason: "email_not_found",
        orderNumber,
      });
    }

    console.log(`${LOG} Found email for`, contact.orderName);
    return NextResponse.json({ ok: true, ...contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const piiBlocked =
      /not approved to access the Customer object|Protected customer data|ACCESS_DENIED/i.test(
        message
      );
    console.error(`${LOG} FAILED`, error);
    return NextResponse.json(
      {
        ok: false,
        reason: piiBlocked ? "shopify_pii_blocked" : "exception",
        errors: [message],
        hint: piiBlocked
          ? "Shopify Basic plan blocks Admin PII. Use the sheet Email column filled by the orders webhook instead."
          : undefined,
      },
      { status: piiBlocked ? 200 : 500 }
    );
  }
}
