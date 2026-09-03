"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { money } from "@/lib/sales/calculations";
import {
  formatOrderStatus,
  orderStatusBadgeClass,
} from "@/lib/sales/status";
import type { SalesOrder } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrdersTableProps = {
  orders: SalesOrder[];
  onEdit: (order: SalesOrder) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  deletingId: string | null;
};

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  onEdit,
  onDelete,
  editingId,
  deletingId,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, orders.length]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page, pageSize]);

  const rangeStart = orders.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, orders.length);

  if (!orders.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No orders added yet.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
              <th className="py-3 pr-3 font-medium">Order</th>
              <th className="py-3 pr-3 font-medium">Date</th>
              <th className="py-3 pr-3 font-medium w-[140px] max-w-[140px]">
                Buyer
              </th>
              <th className="py-3 pr-3 font-medium">Products</th>
              <th className="py-3 pr-3 font-medium">Weight</th>
              <th className="py-3 pr-3 font-medium">COD</th>
              <th className="py-3 pr-3 font-medium">Profit</th>
              <th className="py-3 pr-3 font-medium">Status</th>
              <th className="py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => {
              const c = order.calculation;
              return (
                <tr key={order.id} className="border-b border-[#f3f4f6]">
                  <td className="py-3 pr-3 font-semibold">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 pr-3">{order.date}</td>
                  <td className="py-3 pr-3 max-w-[140px]">
                    <span
                      className="block truncate"
                      title={order.buyerName || undefined}
                    >
                      {order.buyerName || "—"}
                    </span>
                  </td>
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => onEdit(order)}
                        disabled={deletingId === order.id}
                        className="rounded-lg bg-[#f3f4f6] text-[#374151] px-3 py-1.5 text-[13px] hover:opacity-90 disabled:opacity-50"
                      >
                        {editingId === order.id ? "Editing" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => onDelete(order.id)}
                        isLoading={deletingId === order.id}
                        disabled={editingId === order.id}
                        className="rounded-lg bg-[#fef2f2] text-[#b91c1c] px-3 py-1.5 text-[13px] hover:opacity-90 disabled:opacity-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[#6b7280]">
          Showing {rangeStart}–{rangeEnd} of {orders.length} orders
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-[#6b7280]">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[13px] text-[#1f2937]"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[88px] text-center text-[13px] text-[#374151]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              aria-label="Next page"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersTable;
