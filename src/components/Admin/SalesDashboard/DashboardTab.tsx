"use client";

import React, { useMemo, useState } from "react";

import {
  buildDashboardStats,
  currentMonthValue,
  money,
} from "@/lib/sales/calculations";
import { formatOrderStatus } from "@/lib/sales/status";
import type { SalesOrder } from "@/lib/sales/types";

type DashboardTabProps = {
  orders: SalesOrder[];
};

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

const DashboardTab: React.FC<DashboardTabProps> = ({ orders }) => {
  const [month, setMonth] = useState(currentMonthValue());

  const stats = useMemo(
    () => buildDashboardStats(orders, month),
    [orders, month],
  );

  const monthLabel = formatMonthLabel(month);

  const statCards = [
    { label: "Total Orders", value: String(stats.totalOrders) },
    { label: "Delivered", value: String(stats.delivered) },
    { label: "Returned", value: String(stats.returned), danger: true },
    {
      label: "Promotional Giveaways",
      value: String(stats.promotional),
    },
    { label: "Pending", value: String(stats.pending) },
    { label: "Product Sales", value: money(stats.sales) },
    { label: "Shipping Collected", value: money(stats.shipping) },
    { label: "Total Expenses", value: money(stats.expenses) },
    {
      label: "Net Profit",
      value: money(stats.netProfit),
      success: true,
    },
  ];

  return (
    <div>
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-semibold">Monthly Overview</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">{monthLabel}</p>
          </div>
          <label className="block max-w-xs">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Select Month
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e5e7eb] bg-white p-4"
          >
            <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
            <p
              className={`text-[24px] font-bold ${
                card.success
                  ? "text-[#047857]"
                  : card.danger
                    ? "text-[#b91c1c]"
                    : "text-[#1f2937]"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-black text-white px-5 py-4 mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] opacity-80">Monthly Net Profit</p>
          <p className="text-[14px] opacity-90">
            {monthLabel} — after honey, packing, courier, return, and
            promotional expenses
          </p>
        </div>
        <strong className="text-[28px]">{money(stats.netProfit)}</strong>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <h2 className="text-[19px] font-semibold mb-4">Monthly Orders</h2>

        {!stats.orders.length ? (
          <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
            No orders found for {monthLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                  <th className="py-3 pr-3 font-medium">Order</th>
                  <th className="py-3 pr-3 font-medium">Date</th>
                  <th className="py-3 pr-3 font-medium w-[140px] max-w-[140px]">
                    Buyer
                  </th>
                  <th className="py-3 pr-3 font-medium">Products</th>
                  <th className="py-3 pr-3 font-medium">Weight</th>
                  <th className="py-3 pr-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#f3f4f6] transition-colors hover:bg-[#f3f4f6]"
                  >
                    <td className="py-3 pr-3">{order.orderNumber}</td>
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
                    <td className="py-3 pr-3">
                      {order.calculation.weight.toFixed(2)} kg
                    </td>
                    <td className="py-3 pr-3">
                      {formatOrderStatus(order.status)}
                    </td>
                    <td className="py-3">
                      {money(order.calculation.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
