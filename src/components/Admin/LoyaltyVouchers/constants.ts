export type VoucherEmailFilterTab = "all" | "sent" | "failed" | "pending";

export const VOUCHER_EMAIL_FILTER_TABS: {
  id: VoucherEmailFilterTab;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
  { id: "pending", label: "Pending" },
];
