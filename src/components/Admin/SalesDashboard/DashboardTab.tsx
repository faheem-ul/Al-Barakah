"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  buildDashboardStats,
  buildStockSummary,
  currentMonthValue,
  defaultStockDateRange,
  money,
} from "@/lib/sales/calculations";
import { formatProductLineLabel } from "@/lib/sales/products";
import { formatOrderStatus } from "@/lib/sales/status";
import type { SalesOrder, StockExpense, StockPurchase } from "@/lib/sales/types";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type DashboardTabProps = {
  orders: SalesOrder[];
  purchases: StockPurchase[];
  expenses: StockExpense[];
};

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  orders,
  purchases,
  expenses,
}) => {
  const [month, setMonth] = useState(currentMonthValue());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const defaultRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);

  const stats = useMemo(
    () => buildDashboardStats(orders, month),
    [orders, month],
  );

  const totalPages = Math.max(1, Math.ceil(stats.orders.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [month, pageSize, stats.orders.length]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return stats.orders.slice(start, start + pageSize);
  }, [stats.orders, page, pageSize]);

  const rangeStart = stats.orders.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, stats.orders.length);

  const stockSummary = useMemo(
    () => buildStockSummary(orders, purchases, expenses, fromDate, toDate),
    [orders, purchases, expenses, fromDate, toDate],
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

  const expenseBreakdown = [
    {
      label: "Stock expenses",
      value: stockSummary.stockExpensesTotal,
      note: "Rent, fuel, etc. from Stock page",
    },
    {
      label: "Delivered fulfillment",
      value: stockSummary.deliveredFulfillmentExpenses,
      note: "Packing + courier + custom fees on delivered orders",
    },
    {
      label: "Returned orders",
      value: stockSummary.returnedOrderExpenses,
      note: "Packing + courier + custom fees on returned orders",
    },
    {
      label: "Promotional fulfillment",
      value: stockSummary.promotionalFulfillmentExpenses,
      note: "Packing + courier + custom fees on giveaway orders",
    },
  ];

  const periodMetrics = [
    {
      label: "Inventory Purchased",
      value: money(stockSummary.purchasesTotal),
      hint: "Cash spent on stock — tracked separately, not deducted from net profit",
      muted: true,
    },
    {
      label: "Sales (Delivered)",
      value: money(stockSummary.salesTotal),
      hint: "Product price + customer shipping (COD)",
      success: stockSummary.salesTotal > 0,
    },
    {
      label: "COGS (Honey Used)",
      value: money(stockSummary.cogs),
      hint: "Honey cost when sold or given away",
    },
    {
      label: "Expenses Total",
      value: money(stockSummary.expensesTotal),
      hint: "Stock expenses + order costs (see breakdown below)",
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

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="max-w-2xl">
            <h2 className="text-[19px] font-semibold">Purchases & Expenses</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">
              {fromDate} to {toDate}
              {stockSummary.invalidRange
                ? " — invalid date range"
                : ` · ${stockSummary.purchaseCount} purchase${stockSummary.purchaseCount === 1 ? "" : "s"} · ${stockSummary.expenseCount} stock expense${stockSummary.expenseCount === 1 ? "" : "s"} · ${stockSummary.deliveredOrderCount} delivered order${stockSummary.deliveredOrderCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[280px]">
            <label className="block">
              <span className="text-[13px] text-[#6b7280] mb-1 block">
                From
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-[#6b7280] mb-1 block">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
              />
            </label>
          </div>
        </div>

        {stockSummary.invalidRange && (
          <p className="mb-4 text-[13px] text-[#b91c1c]">
            From date must be on or before To date.
          </p>
        )}

        <div className="rounded-lg bg-[#f9fafb] border border-[#e5e7eb] px-4 py-3 mb-5 text-[13px] text-[#4b5563]">
          <p className="font-medium text-[#374151] mb-1">How net profit is calculated</p>
          <p>
            <span className="font-semibold text-[#1f2937]">Net Profit</span> = Sales
            − COGS − Expenses &nbsp;·&nbsp; Inventory purchases are shown for
            reference only (stock on hand is not a loss)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {periodMetrics.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border p-4 ${
                card.muted
                  ? "border-[#e5e7eb] bg-[#fafafa]"
                  : "border-[#e5e7eb] bg-white"
              }`}
            >
              <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
              <p
                className={`text-[22px] font-bold leading-tight ${
                  card.success
                    ? "text-[#047857]"
                    : card.muted
                      ? "text-[#6b7280]"
                      : "text-[#1f2937]"
                }`}
              >
                {card.value}
              </p>
              <p className="text-[11px] text-[#9ca3af] mt-2 leading-snug">
                {card.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e5e7eb] overflow-hidden mb-5">
          <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e5e7eb]">
            <h3 className="text-[14px] font-semibold text-[#1f2937]">
              Expenses breakdown
            </h3>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              These four items add up to Expenses Total ({money(stockSummary.expensesTotal)}).
              Honey cost is listed under COGS, not here.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280] bg-white">
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">What is included</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseBreakdown.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-[#f3f4f6] last:border-0"
                  >
                    <td className="py-3 px-4 font-medium text-[#374151]">
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{row.note}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#1f2937]">
                      {money(row.value)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#fafafa]">
                  <td
                    className="py-3 px-4 font-semibold text-[#1f2937]"
                    colSpan={2}
                  >
                    Expenses Total
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#1f2937]">
                    {money(stockSummary.expensesTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={`rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            stockSummary.netProfit >= 0 ? "bg-[#047857]" : "bg-[#b91c1c]"
          } text-white`}
        >
          <div>
            <p className="text-[12px] opacity-90 uppercase tracking-wide">
              Net Profit
            </p>
            <p className="text-[14px] opacity-95 mt-1 font-mono">
              {money(stockSummary.salesTotal)} − {money(stockSummary.cogs)} −{" "}
              {money(stockSummary.expensesTotal)}
            </p>
          </div>
          <strong className="text-[28px] sm:text-[32px]">
            {money(stockSummary.netProfit)}
          </strong>
        </div>
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
                {paginatedOrders.map((order) => (
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
                          {formatProductLineLabel(p.product, p.variant)} ×{" "}
                          {p.qty}
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

        {stats.orders.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6b7280]">
              Showing {rangeStart}–{rangeEnd} of {stats.orders.length} orders
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
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
