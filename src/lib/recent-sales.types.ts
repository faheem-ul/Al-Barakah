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
