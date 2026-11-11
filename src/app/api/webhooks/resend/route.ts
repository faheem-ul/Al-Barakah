import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

import {
  bounceMessageFromResendEvent,
  isResendDeliveryFailureEvent,
  logResendWebhookEvent,
  loyaltyOrderKeyFromResendEvent,
  parseResendWebhookPayload,
} from "@/lib/email/resend-webhook";
import { markLoyaltyVoucherDeliveryBounced } from "@/lib/loyalty/voucher-email-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[Resend Webhook]";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn(`${LOG} RESEND_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  const payload = await request.text();
  if (!payload) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim() || "re_webhook_verify";
  const resend = new Resend(apiKey);

  let verified: unknown;
  try {
    verified = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch (error) {
    console.warn(`${LOG} signature verification failed`, error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const event = parseResendWebhookPayload(verified);
  if (!event?.type) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  logResendWebhookEvent(event);

  if (!isResendDeliveryFailureEvent(event.type)) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const orderKey = loyaltyOrderKeyFromResendEvent(event);
  if (!orderKey) {
    console.warn(`${LOG} bounce without loyalty_order tag — skipped`);
    return NextResponse.json({ ok: true, ignored: "no_loyalty_tag" });
  }

  await markLoyaltyVoucherDeliveryBounced(orderKey, {
    emailError: bounceMessageFromResendEvent(event),
    emailProvider: "resend",
  });

  return NextResponse.json({ ok: true, orderKey, status: "failed" });
}
