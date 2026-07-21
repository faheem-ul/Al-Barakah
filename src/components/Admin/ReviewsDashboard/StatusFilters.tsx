"use client";

import React from "react";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { FilterTab, TABS } from "./constants";

type StatusFiltersProps = {
  filter: FilterTab;
  statusCounts: Record<FilterTab, number>;
  onFilterChange: (id: FilterTab) => void;
  onOpenStatusSheet: () => void;
};

const StatusFilters: React.FC<StatusFiltersProps> = ({
  filter,
  statusCounts,
  onFilterChange,
  onOpenStatusSheet,
}) => {
  const currentStatusTab = TABS.find((t) => t.id === filter) || TABS[0];

  return (
    <>
      <div className="md:hidden mb-6">
        <button
          type="button"
          aria-label="Filter by status"
          onClick={onOpenStatusSheet}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md border border-black/15 bg-white text-[#302A25] text-[14px] font-medium"
        >
          <Filter className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>
            {currentStatusTab.label}
            <span className="ml-1 opacity-70">
              ({statusCounts[currentStatusTab.id]})
            </span>
          </span>
        </button>
      </div>

      <div className="hidden md:flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            className={cn(
              "px-4 py-2 text-[14px] font-medium rounded-md border transition-colors",
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

export default StatusFilters;
