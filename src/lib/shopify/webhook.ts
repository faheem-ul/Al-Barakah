import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import type { RecentSaleInput } from "@/lib/recent-sales.types";
import { salesPopupConfig } from "@/lib/salesPopup.config";
import { getProductByID } from "@/lib/shopify/actions/product";

/**
 * Minimal Shopify order webhook payload fields we read.
 * Intentionally omits email, phone, payment, and full address.
 */
type ShopifyAddress = {
  first_name?: string | null;
  city?: string | null;
};

type ShopifyLineItemImage = {
  src?: string | null;
};

type ShopifyLineItem = {
  id?: number | string | null;
  title?: string | null;
  name?: string | null;
  product_id?: number | string | null;
  image?: string | ShopifyLineItemImage | null;
  featured_image?: ShopifyLineItemImage | null;
};

type ShopifyCustomer = {
  first_name?: string | null;
};

export type ShopifyOrderCreatePayload = {
  id?: number | string | null;
  created_at?: string | null;
  customer?: ShopifyCustomer | null;
  billing_address?: ShopifyAddress | null;
  shipping_address?: ShopifyAddress | null;
  line_items?: ShopifyLineItem[] | null;
};

/**
 * Verify Shopify webhook HMAC (X-Shopify-Hmac-Sha256).
 * Uses timing-safe comparison to avoid leaking secret length via timing.
 */
export const verifyShopifyWebhookHmac = (
  rawBody: string,
  hmacHeader: string | null,
  secret = process.env.SHOPIFY_WEBHOOK_SECRET
): boolean => {
  if (!secret || !hmacHeader) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  try {
    const digestBuffer = Buffer.from(digest, "utf8");
    const headerBuffer = Buffer.from(hmacHeader, "utf8");

    if (digestBuffer.length !== headerBuffer.length) {
      return false;
    }

    return timingSafeEqual(digestBuffer, headerBuffer);
  } catch {
    return false;
  }
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractFirstName = (order: ShopifyOrderCreatePayload): string => {
  return (
    asNonEmptyString(order.customer?.first_name) ??
    asNonEmptyString(order.shipping_address?.first_name) ??
    asNonEmptyString(order.billing_address?.first_name) ??
    salesPopupConfig.fallbackFirstName
  );
};

const extractCity = (order: ShopifyOrderCreatePayload): string => {
  return (
    asNonEmptyString(order.shipping_address?.city) ??
    asNonEmptyString(order.billing_address?.city) ??
    salesPopupConfig.fallbackCity
  );
};

const extractLineItemImage = (item: ShopifyLineItem): string => {
  if (typeof item.image === "string") {
    return asNonEmptyString(item.image) ?? "";
  }

  return (
    asNonEmptyString(item.image?.src) ??
    asNonEmptyString(item.featured_image?.src) ??
    ""
  );
};

/**
 * Shopify order webhooks carry no product imagery, so the image is resolved
 * from the Storefront API using the line item's product_id.
 */
const fetchProductImage = async (productId: string): Promise<string> => {
  try {
    const response = await getProductByID(`gid://shopify/Product/${productId}`);
    const product = response.data;

    return (
      asNonEmptyString(product?.featuredImage?.url) ??
      asNonEmptyString(product?.images?.[0]?.url) ??
      ""
    );
  } catch (error) {
    console.error("[Shopify Webhook] Product image lookup failed", {
      productId,
      error,
    });
    return "";
  }
};

// Keyed by product id so repeat orders of the same product reuse one request.
const productImageCache = new Map<string, Promise<string>>();

const resolveProductImage = (productId: string): Promise<string> => {
  const cached = productImageCache.get(productId);

  if (cached) {
    return cached;
  }

  const pending = fetchProductImage(productId).then((url) => {
    // Misses are dropped so a later order retries instead of caching a blank.
    if (!url) {
      productImageCache.delete(productId);
    }

    return url;
  });

  productImageCache.set(productId, pending);
  return pending;
};

/**
 * Map a Shopify orders/create payload into privacy-safe sale records.
 * One record per line item so each product can notify separately.
 */
export const extractRecentSalesFromOrder = async (
  order: ShopifyOrderCreatePayload
): Promise<RecentSaleInput[]> => {
  const shopifyOrderId = order.id != null ? String(order.id) : null;

  if (!shopifyOrderId) {
    return [];
  }

  const createdAtMs = order.created_at
    ? Date.parse(order.created_at)
    : Date.now();
  const createdAt = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();

  const firstName = extractFirstName(order);
  const city = extractCity(order);
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

  const drafts: { sale: RecentSaleInput; productId: string | null }[] = [];

  for (const [index, item] of lineItems.entries()) {
    const productTitle =
      asNonEmptyString(item.title) ?? asNonEmptyString(item.name);

    // Skip items we cannot meaningfully display
    if (!productTitle) {
      continue;
    }

    const lineItemId =
      item.id != null ? String(item.id) : `line-${index}`;

    drafts.push({
      sale: {
        id: `${shopifyOrderId}_${lineItemId}`,
        shopifyOrderId,
        lineItemId,
        firstName,
        city,
        productTitle,
        productImage: extractLineItemImage(item),
        createdAt,
      },
      productId: item.product_id != null ? String(item.product_id) : null,
    });
  }

  // Resolved in parallel to stay inside Shopify's ~5s webhook response budget.
  return Promise.all(
    drafts.map(async ({ sale, productId }) => {
      if (sale.productImage || !productId) {
        return sale;
      }

      return { ...sale, productImage: await resolveProductImage(productId) };
    })
  );
};
