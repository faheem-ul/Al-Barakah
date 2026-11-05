"use client";

import React from "react";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  VOUCHER_EMAIL_FILTER_TABS,
  type VoucherEmailFilterTab,
} from "./constants";

type VoucherEmailFiltersProps = {
  filter: VoucherEmailFilterTab;
  statusCounts: Record<VoucherEmailFilterTab, number>;
  onFilterChange: (id: VoucherEmailFilterTab) => void;
  onOpenStatusSheet: () => void;
};

const VoucherEmailFilters: React.FC<VoucherEmailFiltersProps> = ({
  filter,
  statusCounts,
  onFilterChange,
  onOpenStatusSheet,
}) => {
  const currentTab =
    VOUCHER_EMAIL_FILTER_TABS.find((t) => t.id === filter) ||
    VOUCHER_EMAIL_FILTER_TABS[0];

  return (
    <>
      <div className="md:hidden text-center mb-6">
        <button
          type="button"
          aria-label="Filter by status"
          onClick={onOpenStatusSheet}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md border border-black/15 bg-white text-[#302A25] text-[14px] font-medium"
        >
          <Filter className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>
            {currentTab.label}
            <span className="ml-1 opacity-70">
              ({statusCounts[currentTab.id]})
            </span>
          </span>
        </button>
      </div>

      <div className="hidden md:flex flex-wrap gap-2 mb-6">
        {VOUCHER_EMAIL_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            className={cn(
              "px-4 py-2 text-[14px] font-medium rounded-md border transition-colors cursor-pointer",
              filter === tab.id
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black/15 hover:border-black/40",
            )}
          >
            {tab.label}
            <span className="ml-1 opacity-70">({statusCounts[tab.id]})</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default VoucherEmailFilters;
