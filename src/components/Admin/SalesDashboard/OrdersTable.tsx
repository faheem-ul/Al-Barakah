"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import {
  formatOrderStatus,
  orderStatusBadgeClass,
} from "@/lib/sales/status";
import type { SalesOrder } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type OrdersTableProps = {
  orders: SalesOrder[];
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  onDelete,
  deletingId,
}) => {
  if (!orders.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No orders added yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Order</th>
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Products</th>
            <th className="py-3 pr-3 font-medium">Weight</th>
            <th className="py-3 pr-3 font-medium">COD</th>
            <th className="py-3 pr-3 font-medium">Profit</th>
            <th className="py-3 pr-3 font-medium">Status</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const c = order.calculation;
            return (
              <tr key={order.id} className="border-b border-[#f3f4f6]">
                <td className="py-3 pr-3 font-semibold">{order.orderNumber}</td>
                <td className="py-3 pr-3">{order.date}</td>
                <td className="py-3 pr-3">
                  {order.products.map((p) => (
                    <div key={`${p.key}-${p.qty}`}>
                      {p.product} {p.variant} × {p.qty}
                    </div>
                  ))}
                </td>
                <td className="py-3 pr-3">{c.weight.toFixed(2)} kg</td>
                <td className="py-3 pr-3">
                  {order.status === "delivered" ? money(c.revenue) : "Rs. 0"}
                </td>
                <td
                  className={`py-3 pr-3 font-semibold ${
                    c.netProfit >= 0 ? "text-[#047857]" : "text-[#b91c1c]"
                  }`}
                >
                  {money(c.netProfit)}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${orderStatusBadgeClass(order.status)}`}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </td>
                <td className="py-3">
                  <Button
                    type="button"
                    onClick={() => onDelete(order.id)}
                    isLoading={deletingId === order.id}
                    className="rounded-lg bg-[#fef2f2] text-[#b91c1c] px-3 py-1.5 text-[13px] hover:opacity-90"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
