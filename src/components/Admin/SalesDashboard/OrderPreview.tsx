"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { OrderPreviewResult, OrderStatus } from "@/lib/sales/types";

type OrderPreviewProps = {
  result: OrderPreviewResult | null;
  status: OrderStatus;
  productPacking?: number;
  boxPacking?: number;
};

function PreviewCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3">
      <p className="text-[12px] text-[#6b7280]">{label}</p>
      <p className="text-[15px] font-semibold text-[#1f2937]">{value}</p>
    </div>
  );
}

const OrderPreview: React.FC<OrderPreviewProps> = ({
  result,
  status,
  productPacking,
  boxPacking,
}) => {
  if (!result || result.units <= 0) return null;

  const profitLabel =
    status === "returned"
      ? "Return Loss"
      : status === "promotional"
        ? "Giveaway Expense"
        : "Order Profit";

  const showPackingBreakdown =
    productPacking !== undefined && boxPacking !== undefined;

  const topItems: { key: string; label: string; value: string }[] = [
    {
      key: "product-total",
      label: "Product Total",
      value: money(result.productRevenue),
    },
    ...(status === "promotional"
      ? [
          {
            key: "product-cost",
            label: "Actual Product Cost",
            value: money(result.honeyCost),
          },
        ]
      : []),
    {
      key: "weight",
      label: "Total Weight",
      value: `${result.weight.toFixed(2)} kg`,
    },
    {
      key: "customer-shipping",
      label: "Customer Shipping",
      value:
        result.customerShipping === 0
          ? "FREE"
          : money(result.customerShipping),
    },
    {
      key: "cod",
      label: "COD Amount",
      value: status === "delivered" ? money(result.revenue) : "Rs. 0",
    },
  ];

  const rightItems: { key: string; label: string; value: string }[] = [
    {
      key: "courier",
      label: "Actual Courier",
      value: money(result.courier),
    },
    ...(result.customExpenses.length
      ? result.customExpenses.map((expense) => ({
          key: expense.id,
          label: expense.name,
          value: money(expense.amount),
        }))
      : []),
    { key: "expenses", label: "Expenses", value: money(result.expenses) },
  ];

  const totalPacking = showPackingBreakdown
    ? productPacking + boxPacking
    : result.packing;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topItems.map((item) => (
          <PreviewCard key={item.key} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          {showPackingBreakdown ? (
            <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3 h-full">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-[#6b7280]">Product Packing</p>
                  <p className="text-[15px] font-semibold text-[#1f2937]">
                    {money(productPacking)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#6b7280]">Box Packing</p>
                  <p className="text-[15px] font-semibold text-[#1f2937]">
                    {money(boxPacking)}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-[#e5e7eb] pt-3">
                <p className="text-[12px] text-[#6b7280]">
                  Product Packing + Box Packing
                </p>
                <p className="text-[15px] font-semibold text-[#1f2937]">
                  Total Packing: {money(totalPacking)}
                </p>
              </div>
            </div>
          ) : (
            <PreviewCard label="Packing" value={money(result.packing)} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {rightItems.map((item) => (
            <PreviewCard key={item.key} label={item.label} value={item.value} />
          ))}
        </div>
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
