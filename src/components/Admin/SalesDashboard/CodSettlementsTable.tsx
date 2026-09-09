"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { CodSettlement } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type CodSettlementsTableProps = {
  settlements: CodSettlement[];
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const CodSettlementsTable: React.FC<CodSettlementsTableProps> = ({
  settlements,
  onDelete,
  deletingId,
}) => {
  if (!settlements.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No COD settlements recorded for this month.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Amount</th>
            <th className="py-3 pr-3 font-medium">Reference</th>
            <th className="py-3 pr-3 font-medium">Note</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((settlement) => (
            <tr key={settlement.id} className="border-b border-[#f3f4f6]">
              <td className="py-3 pr-3">{settlement.date}</td>
              <td className="py-3 pr-3 font-semibold text-[#047857]">
                {money(settlement.amount)}
              </td>
              <td className="py-3 pr-3">{settlement.reference || "—"}</td>
              <td className="py-3 pr-3">{settlement.note || "—"}</td>
              <td className="py-3">
                <Button
                  type="button"
                  onClick={() => onDelete(settlement.id)}
                  isLoading={deletingId === settlement.id}
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

export default CodSettlementsTable;
