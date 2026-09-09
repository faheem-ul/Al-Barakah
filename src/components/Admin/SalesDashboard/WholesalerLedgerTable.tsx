"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { WholesalerLedgerEntry } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type WholesalerLedgerTableProps = {
  entries: WholesalerLedgerEntry[];
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const WholesalerLedgerTable: React.FC<WholesalerLedgerTableProps> = ({
  entries,
  onDelete,
  deletingId,
}) => {
  if (!entries.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No wholesaler entries recorded for this month.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Type</th>
            <th className="py-3 pr-3 font-medium">Amount</th>
            <th className="py-3 pr-3 font-medium">Note</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-[#f3f4f6]">
              <td className="py-3 pr-3">{entry.date}</td>
              <td className="py-3 pr-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                    entry.type === "credit"
                      ? "bg-[#fff7ed] text-[#b45309]"
                      : "bg-[#ecfdf5] text-[#047857]"
                  }`}
                >
                  {entry.type === "credit" ? "Credit" : "Payment"}
                </span>
              </td>
              <td className="py-3 pr-3 font-semibold">{money(entry.amount)}</td>
              <td className="py-3 pr-3">{entry.note || "—"}</td>
              <td className="py-3">
                <Button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  isLoading={deletingId === entry.id}
                  className="rounded-lg bg-[#fef2f2] text-[#b91c1c] px-3 py-1.5 text-[13px] hover:opacity-90"
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WholesalerLedgerTable;
