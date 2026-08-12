import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies Shopify webhook HMAC (X-Shopify-Hmac-Sha256).
 * Uses the raw request body bytes and the webhook signing secret.
 */
export function verifyShopifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string | null,
  secret: string
): boolean {
  if (!hmacHeader || !secret) return false;

  const digest = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const headerBuffer = Buffer.from(hmacHeader, "utf8");

  if (digestBuffer.length !== headerBuffer.length) return false;

  return timingSafeEqual(digestBuffer, headerBuffer);
}
