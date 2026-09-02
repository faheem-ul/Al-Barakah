import type { OrderStatus } from "./types";

export function formatOrderStatus(status: OrderStatus | string): string {
  switch (status) {
    case "delivered":
      return "Delivered";
    case "returned":
      return "Returned";
    case "pending":
      return "Pending";
    case "promotional":
      return "Promotional Giveaway";
    default:
      return status;
  }
}

export function orderStatusBadgeClass(status: OrderStatus | string): string {
  if (status === "delivered") return "bg-[#ecfdf5] text-[#047857]";
  if (status === "returned") return "bg-[#fef2f2] text-[#b91c1c]";
  if (status === "promotional") return "bg-[#f5f3ff] text-[#6d28d9]";
  return "bg-[#fffbeb] text-[#b45309]";
}
