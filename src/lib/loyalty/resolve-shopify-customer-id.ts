import { getShopifyCustomerIdByEmail } from "@/lib/loyalty/shopify-customer-directory";
import { findShopifyCustomerIdByEmail } from "@/lib/shopify/admin/lookup-customer-by-email";
import type { ShopifyWebhookOrder } from "@/lib/shopify/types/webhook-order";

function str(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function resolveShopifyCustomerIdForOrder(
  order: ShopifyWebhookOrder,
  options?: { allowCustomerEmailSearch?: boolean },
): Promise<number | null> {
  const fromWebhook = order.customer?.id;
  if (fromWebhook !== undefined && fromWebhook !== null) {
    const n = Number(fromWebhook);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const email = str(order.email || order.customer?.email).toLowerCase();
  if (!email) return null;

  // Imported Shopify customers CSV (works on Basic plan where Customer API is blocked).
  const fromDirectory = await getShopifyCustomerIdByEmail(email);
  if (fromDirectory) return fromDirectory;

  if (options?.allowCustomerEmailSearch === false) {
    return null;
  }

  return findShopifyCustomerIdByEmail(email);
}
