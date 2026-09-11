import { NextRequest, NextResponse } from "next/server";
import {
  sendDeliveredTrackingEmails,
  type TrackingStatusEmailInput,
} from "@/lib/email/tracking-status";
import { lookupOrderCustomerContact } from "@/lib/shopify/admin/lookup-order-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[delivered-email]";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST tracking payload with header x-sync-secret to send admin + customer Delivered emails (same templates as Apps Script status updates).",
  });
}

export async function POST(request: NextRequest) {
  const expected = process.env.SHEET_TO_SHOPIFY_SYNC_SECRET?.trim();
  if (!expected) {
    console.error(`${LOG} SHEET_TO_SHOPIFY_SYNC_SECRET not configured`);
    return NextResponse.json(
      { error: "Sync secret not configured" },
      { status: 500 },
    );
  }

  const provided = request.headers.get("x-sync-secret") || "";
  if (!timingSafeEqual(provided, expected)) {
    console.warn(`${LOG} Invalid sync secret`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cn = str(body.cn || body.trackingNumber);
  const status = str(body.status) || "Delivered";
  if (!cn) {
    return NextResponse.json(
      { ok: false, reason: "missing_cn" },
      { status: 400 },
    );
  }

  const orderNumber = str(body.orderNumber);
  let customerEmail = str(body.customerEmail || body.email).toLowerCase();
  let customerName = str(body.customerName || body.name) || "Customer";

  if ((!customerEmail || !customerEmail.includes("@")) && orderNumber) {
    try {
      const contact = await lookupOrderCustomerContact(orderNumber);
      if (contact?.email) {
        customerEmail = contact.email;
        if (!str(body.customerName || body.name) && contact.name) {
          customerName = contact.name;
        }
        console.log(`${LOG} Resolved customer email via Shopify for`, orderNumber);
      }
    } catch (err) {
      console.warn(`${LOG} Shopify contact lookup failed:`, err);
    }
  }

  const input: TrackingStatusEmailInput = {
    cn,
    status,
    location: str(body.location),
    detail: str(body.detail),
    mpPreviousStatus: str(body.mpPreviousStatus || body.previousMpStatus),
    previousStatus: str(body.previousStatus),
    orderNumber,
    customerName,
    contactNumber: str(body.contactNumber || body.contact),
    customerEmail,
    additionalNote: str(body.additionalNote),
    address: str(body.address),
    city: str(body.city),
    totalAmount: str(body.totalAmount || body.total),
    checkedAt: str(body.checkedAt),
  };

  console.log(`${LOG} Sending`, {
    cn,
    status,
    orderNumber,
    hasCustomerEmail: Boolean(customerEmail),
  });

  try {
    const result = await sendDeliveredTrackingEmails(input);
    console.log(`${LOG} Result`, result);
    return NextResponse.json(
      {
        ok: result.ok,
        admin: result.admin,
        customer: result.customer,
      },
      { status: result.admin.sent || result.customer.sent ? 200 : 422 },
    );
  } catch (error) {
    console.error(`${LOG} FAILED`, error);
    return NextResponse.json(
      {
        ok: false,
        reason: "exception",
        errors: [error instanceof Error ? error.message : String(error)],
      },
      { status: 500 },
    );
  }
}
