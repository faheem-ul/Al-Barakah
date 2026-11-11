import "server-only";

import { lookupOrderSheetContactByOrderNumbers } from "@/lib/google/sheets";

export type ManualLoyaltyContactDetails = {
  email: string;
  shopifyCustomerId: number | null;
  customerName: string;
  phone: string;
};

/**
 * Name and phone from ops Google Sheet only (Shopify Customer API blocked on Basic).
 */
export async function resolveManualLoyaltyContactDetails(params: {
  orderKey: string;
  email: string;
  shopifyCustomerId: number | null;
  customerNameOverride?: string;
  phoneOverride?: string;
}): Promise<ManualLoyaltyContactDetails> {
  const sheetContacts = await lookupOrderSheetContactByOrderNumbers([
    params.orderKey,
  ]);
  const sheet = sheetContacts.get(params.orderKey);

  const customerName =
    params.customerNameOverride?.trim() || sheet?.name?.trim() || "";
  const phone = params.phoneOverride?.trim() || sheet?.phone?.trim() || "";

  return {
    email: params.email,
    shopifyCustomerId: params.shopifyCustomerId,
    customerName,
    phone,
  };
}
