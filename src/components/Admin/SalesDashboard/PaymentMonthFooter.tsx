"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

type PaymentMonthFooterProps = {
  month: string;
  onMonthChange: (month: string) => void;
  count: number;
  emptyLabel: string;
};

const PaymentMonthFooter: React.FC<PaymentMonthFooterProps> = ({
  month,
  onMonthChange,
  count,
  emptyLabel,
}) => (
  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-[13px] text-[#6b7280]">
      {count
        ? `${count} record${count === 1 ? "" : "s"} in ${formatMonthLabel(month)}`
        : `${emptyLabel} in ${formatMonthLabel(month)}`}
    </p>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onMonthChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb]"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-[140px] text-center text-[13px] font-medium text-[#374151]">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => onMonthChange(shiftMonth(month, 1))}
        aria-label="Next month"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb]"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default PaymentMonthFooter;
