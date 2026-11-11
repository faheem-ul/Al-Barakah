import "server-only";

import { humanizeEmailDeliveryError } from "@/lib/email/delivery-error-message";
import { normalizeLoyaltyOrderKey } from "@/lib/loyalty/voucher-email-registry";

const LOG = "[Resend Webhook]";

type ResendWebhookEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { message?: string; type?: string };
    failed?: { reason?: string };
    tags?: Array<{ name: string; value: string }> | Record<string, string>;
  };
};

export function parseResendWebhookPayload(raw: unknown): ResendWebhookEvent | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ResendWebhookEvent;
}

export function loyaltyOrderKeyFromResendEvent(
  event: ResendWebhookEvent,
): string | null {
  const tags = event.data?.tags;
  if (!tags) return null;

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (tag?.name === "loyalty_order" && tag.value) {
        return normalizeLoyaltyOrderKey(tag.value);
      }
    }
    return null;
  }

  if (typeof tags === "object" && "loyalty_order" in tags) {
    return normalizeLoyaltyOrderKey(String(tags.loyalty_order));
  }

  return null;
}

export function bounceMessageFromResendEvent(
  event: ResendWebhookEvent,
): string {
  const bounce = event.data?.bounce?.message?.trim();
  if (bounce) return humanizeEmailDeliveryError(bounce);
  const failed = event.data?.failed?.reason?.trim();
  if (failed) return humanizeEmailDeliveryError(failed);
  const to = event.data?.to?.[0];
  if (to) {
    return humanizeEmailDeliveryError(
      `Delivery failed for ${to} (address not found or rejected).`,
    );
  }
  return humanizeEmailDeliveryError("Email bounced — address undeliverable.");
}

export function isResendDeliveryFailureEvent(type: string): boolean {
  const t = type.trim().toLowerCase();
  return (
    t === "email.bounced" ||
    t === "email.failed" ||
    t === "email.complained"
  );
}

export function logResendWebhookEvent(event: ResendWebhookEvent): void {
  console.log(`${LOG} type=${event.type ?? "unknown"}`, {
    emailId: event.data?.email_id,
    to: event.data?.to,
    orderKey: loyaltyOrderKeyFromResendEvent(event),
  });
}
