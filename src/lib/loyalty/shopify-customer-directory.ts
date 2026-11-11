import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { normalizeLoyaltyCustomerEmail } from "@/lib/loyalty/voucher-email-registry";

/**
 * Email → Shopify customer ID, imported from the Shopify customers CSV export.
 * Needed because the Basic plan blocks Customer PII in the Admin API.
 * Doc id = lower-cased email.
 */
export const SHOPIFY_CUSTOMER_DIRECTORY_COLLECTION = "shopify-customer-directory";

function docIdForEmail(email: string): string | null {
  const normalized = normalizeLoyaltyCustomerEmail(email);
  if (!normalized || normalized.includes("/")) return null;
  return normalized;
}

/** Returns a map of lower-cased email → numeric Shopify customer ID (as string). */
export async function getShopifyCustomerIdsByEmails(
  emails: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const ids = [...new Set(emails.map(docIdForEmail).filter(Boolean))] as string[];
  if (!ids.length) return result;

  const db = getAdminDb();
  const col = db.collection(SHOPIFY_CUSTOMER_DIRECTORY_COLLECTION);
  const snaps = await db.getAll(...ids.map((id) => col.doc(id)));
  for (const snap of snaps) {
    const customerId = snap.exists ? String(snap.get("customerId") || "") : "";
    if (customerId) result.set(snap.id, customerId);
  }
  return result;
}

export async function getShopifyCustomerIdByEmail(
  email: string,
): Promise<number | null> {
  const id = docIdForEmail(email);
  if (!id) return null;
  try {
    const map = await getShopifyCustomerIdsByEmails([id]);
    const n = Number(map.get(id));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (error) {
    console.error("[Shopify Customer Directory] lookup failed", error);
    return null;
  }
}
