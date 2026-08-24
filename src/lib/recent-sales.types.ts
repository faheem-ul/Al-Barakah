/**
 * Shared RecentSale shape — safe for client and server imports.
 * Never includes email, phone, address lines, or payment data.
 */
export type RecentSale = {
  id: string;
  shopifyOrderId: string;
  lineItemId: string;
  firstName: string;
  city: string;
  productTitle: string;
  productImage: string;
  createdAt: number;
};

export type RecentSaleInput = RecentSale;

/** Hide checkout test orders from the storefront sales popup. */
export function isTestBuyerName(firstName: string): boolean {
  const n = String(firstName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!n) return false;

  if (
    n === "test" ||
    n === "tester" ||
    n === "testing" ||
    n === "testuser" ||
    n === "test user" ||
    n === "dummy" ||
    n === "demo" ||
    n === "sample"
  ) {
    return true;
  }

  if (n.startsWith("test ") || n.endsWith(" test") || n.includes(" test ")) {
    return true;
  }

  return /\b(test|tester|testing|dummy|demo|sample)\b/.test(n);
}
