"use client";

import React from "react";

import type { StockPurchase } from "@/lib/sales/types";
import { currentMonthValue } from "@/lib/sales/calculations";

export const CURRENT_YEAR = new Date().getFullYear();

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const PURCHASE_MONTH_TABS = MONTH_LABELS.map((label, index) => ({
  label,
  value: `${CURRENT_YEAR}-${String(index + 1).padStart(2, "0")}`,
}));

export function getPurchaseMonthsWithData(
  purchases: StockPurchase[],
): Set<string> {
  const months = new Set<string>();
  const yearPrefix = String(CURRENT_YEAR);

  for (const purchase of purchases) {
    const date = String(purchase.date || "");
    if (date.startsWith(yearPrefix)) {
      months.add(date.slice(0, 7));
    }
  }

  return months;
}

export function getDefaultPurchaseMonth(purchases: StockPurchase[]): string {
  const monthsWithData = getPurchaseMonthsWithData(purchases);
  if (monthsWithData.size === 0) return currentMonthValue();

  return [...monthsWithData].sort().reverse()[0];
}

type PurchaseMonthTabsProps = {
  selectedMonth: string;
  monthsWithData: Set<string>;
  onSelect: (month: string) => void;
};

const PurchaseMonthTabs: React.FC<PurchaseMonthTabsProps> = ({
  selectedMonth,
  monthsWithData,
  onSelect,
}) => (
  <div>
    <p className="text-[13px] font-medium text-[#374151] mb-2">{CURRENT_YEAR}</p>
    <div
      className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2"
      role="tablist"
      aria-label={`Purchase months for ${CURRENT_YEAR}`}
    >
      {PURCHASE_MONTH_TABS.map((tab) => {
        const hasData = monthsWithData.has(tab.value);
        const isActive = selectedMonth === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!hasData}
            onClick={() => onSelect(tab.value)}
            className={`rounded-lg border px-2 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? "border-[#047857] bg-[#ecfdf5] text-[#047857]"
                : hasData
                  ? "border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb] cursor-pointer"
                  : "border-[#f3f4f6] bg-[#fafafa] text-[#d1d5db] cursor-not-allowed"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default PurchaseMonthTabs;
