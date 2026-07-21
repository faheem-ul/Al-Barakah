import { Review, ReviewStatus } from "@/lib/reviews";
import { adminProductLabel } from "@/lib/admin-products";

export type FilterTab = "all" | ReviewStatus;
export type ProductFilter = "all" | string;

export const UNKNOWN_PRODUCT = "Unknown";

// Status tabs
export const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

// Status badge classes
export const statusBadgeClass: Record<ReviewStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

// Product label
export function productLabel(r: Review): string {
  if (r.productName?.trim()) return r.productName.trim();
  return adminProductLabel(r.productId) || UNKNOWN_PRODUCT;
}
