"use client";

import React from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CloseIcon } from "@/ui/Icons";
import { cn } from "@/lib/utils";
import { FilterTab, TABS } from "./constants";

type StatusSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: FilterTab;
  statusCounts: Record<FilterTab, number>;
  onSelect: (id: FilterTab) => void;
};

const StatusSheet: React.FC<StatusSheetProps> = ({
  open,
  onOpenChange,
  filter,
  statusCounts,
  onSelect,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="bottom"
      className="sheet-slide-bottom rounded-t-2xl border-0 p-0 gap-0 bg-transparent shadow-none [&>button]:hidden"
    >
      <div className="flex flex-col items-center">
        <SheetClose asChild>
          <button
            type="button"
            aria-label="Close"
            className="mb-4 rounded-full bg-white shadow-md flex items-center justify-center"
          >
            <CloseIcon className="w-10 h-10" />
          </button>
        </SheetClose>
        <div className="w-full bg-white rounded-t-2xl pt-2 pb-8 px-6">
          <SheetHeader className="sr-only">
            <SheetTitle>Status</SheetTitle>
            <SheetDescription>Filter reviews by status</SheetDescription>
          </SheetHeader>
          <ul className="py-2">
            {TABS.map((tab) => {
              const selected = filter === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(tab.id)}
                    className={cn(
                      "w-full text-left py-3.5 text-[16px] font-poppins transition-colors",
                      selected
                        ? "text-black font-semibold"
                        : "text-[#6B6B6B] font-normal",
                    )}
                  >
                    {tab.label}
                    <span className="ml-1 opacity-70">
                      ({statusCounts[tab.id]})
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SheetContent>
  </Sheet>
);

export default StatusSheet;
