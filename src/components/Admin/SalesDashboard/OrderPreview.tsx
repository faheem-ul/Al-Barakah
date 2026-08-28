"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { OrderPreviewResult, OrderStatus } from "@/lib/sales/types";

type OrderPreviewProps = {
  result: OrderPreviewResult | null;
  status: OrderStatus;
};

const OrderPreview: React.FC<OrderPreviewProps> = ({ result, status }) => {
  if (!result || result.units <= 0) return null;

  const profitLabel =
    status === "returned" ? "Return Loss" : "Order Profit";

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Product Total", value: money(result.productRevenue) },
          { label: "Total Weight", value: `${result.weight.toFixed(2)} kg` },
          {
            label: "Customer Shipping",
            value:
              result.customerShipping === 0
                ? "FREE"
                : money(result.customerShipping),
          },
          {
            label: "COD Amount",
            value: status === "delivered" ? money(result.revenue) : "Rs. 0",
          },
          { label: "Packing", value: money(result.packing) },
          { label: "Actual Courier", value: money(result.courier) },
          { label: "Expenses", value: money(result.expenses) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3"
          >
            <p className="text-[12px] text-[#6b7280]">{item.label}</p>
            <p className="text-[15px] font-semibold text-[#1f2937]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`flex items-center justify-between rounded-xl px-4 py-3 font-semibold ${
          result.netProfit < 0
            ? "bg-[#fef2f2] text-[#b91c1c]"
            : "bg-[#ecfdf5] text-[#047857]"
        }`}
      >
        <span>{profitLabel}</span>
        <span>{money(result.netProfit)}</span>
      </div>
    </div>
  );
};

export default OrderPreview;
