import type { PaymentSubTab } from "@/lib/sales/types";

export const SALES_PRIMARY = "#000000";

export const ORDER_DRAFT_KEY = "honeyOrderDraft";

export const BUYER_NAME_MAX_LENGTH = 40;

export const CUSTOMER_DISCOUNT_OPTIONS = [0, 150, 300, 500] as const;

export function formatCustomerDiscountLabel(amount: number): string {
  if (amount <= 0) return "No discount";
  return `Rs. ${amount.toLocaleString("en-PK")} off`;
}

export const SALES_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "reports", label: "Reports" },
  { id: "stock", label: "Stock" },
  { id: "settings", label: "Settings" },
] as const;

export const PAYMENTS_SUB_TABS = [
  { id: "payments-mp", label: "M&P COD" },
  { id: "payments-wholesaler", label: "Wholesaler" },
] as const;

export function isPaymentSubTab(tab: string): tab is PaymentSubTab {
  return tab === "payments-mp" || tab === "payments-wholesaler";
}
