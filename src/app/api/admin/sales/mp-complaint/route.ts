import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { sendMpComplaintEmail } from "@/lib/email/mp-complaint";
import { getAdminDb } from "@/lib/firebase/admin";
import { mapOrder } from "@/lib/sales/orders";
import type { SalesOrderPayload } from "@/lib/sales/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { orderId?: string };
  try {
    body = (await request.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = String(body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const snap = await getAdminDb().collection("sales-orders").doc(orderId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = mapOrder(snap.id, snap.data() as Partial<SalesOrderPayload>);

  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Complaint email is only available for pending orders." },
      { status: 400 },
    );
  }

  const consignmentNumber = String(order.consignmentNumber ?? "").trim();
  if (!consignmentNumber) {
    return NextResponse.json(
      { error: "Consignment number is required for this order." },
      { status: 400 },
    );
  }

  const result = await sendMpComplaintEmail(order);

  if (result.skipped) {
    return NextResponse.json(
      { error: result.error || "Email service not configured." },
      { status: 503 },
    );
  }

  if (!result.sent) {
    return NextResponse.json(
      { error: result.error || "Failed to send email." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, sent: true });
}
