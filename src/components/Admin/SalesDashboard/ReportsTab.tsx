"use client";

import React, { useMemo, useState } from "react";

import {
  buildMonthlyReport,
  currentMonthValue,
  money,
} from "@/lib/sales/calculations";
import type { SalesOrder, SalesSettings } from "@/lib/sales/types";

type ReportsTabProps = {
  settings: SalesSettings;
  orders: SalesOrder[];
};

const ReportsTab: React.FC<ReportsTabProps> = ({ settings, orders }) => {
  const [month, setMonth] = useState(currentMonthValue());

  const report = useMemo(
    () => buildMonthlyReport(settings, orders, month),
    [settings, orders, month],
  );

  return (
    <div>
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">Monthly Report</h2>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Orders", value: String(report.monthOrders.length) },
          { label: "Product Sales", value: money(report.sales) },
          { label: "Total Expenses", value: money(report.expenses) },
          {
            label: "Net Profit",
            value: money(report.netProfit),
            success: true,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e5e7eb] bg-white p-4"
          >
            <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
            <p
              className={`text-[24px] font-bold ${
                card.success ? "text-[#047857]" : "text-[#1f2937]"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">
          Delivered Product Sales
        </h2>
        {!report.productRows.length ? (
          <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
            No delivered product sales found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                  <th className="py-3 pr-3 font-medium">Product</th>
                  <th className="py-3 pr-3 font-medium">Variant</th>
                  <th className="py-3 pr-3 font-medium">Units Sold</th>
                  <th className="py-3 font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.productRows.map((item) => (
                  <tr
                    key={`${item.product}-${item.variant}`}
                    className="border-b border-[#f3f4f6]"
                  >
                    <td className="py-3 pr-3">{item.product}</td>
                    <td className="py-3 pr-3">{item.variant}</td>
                    <td className="py-3 pr-3">{item.qty}</td>
                    <td className="py-3">{money(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <h2 className="text-[19px] font-semibold mb-4">Returned Products</h2>
        {!report.returnedRows.length ? (
          <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
            No returned products found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                  <th className="py-3 pr-3 font-medium">Product</th>
                  <th className="py-3 pr-3 font-medium">Variant</th>
                  <th className="py-3 font-medium">Units Returned</th>
                </tr>
              </thead>
              <tbody>
                {report.returnedRows.map((item) => (
                  <tr
                    key={`${item.product}-${item.variant}`}
                    className="border-b border-[#f3f4f6]"
                  >
                    <td className="py-3 pr-3">{item.product}</td>
                    <td className="py-3 pr-3">{item.variant}</td>
                    <td className="py-3">{item.qty}</td>
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

export default ReportsTab;
