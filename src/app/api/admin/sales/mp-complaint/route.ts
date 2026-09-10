import { NextRequest, NextResponse } from "next/server";

import { sendMpComplaintEmail } from "@/lib/email/mp-complaint";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { mapOrder } from "@/lib/sales/orders";
import type { SalesOrderPayload } from "@/lib/sales/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[mp-complaint]";

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.warn(`${LOG} Invalid auth token`, error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
