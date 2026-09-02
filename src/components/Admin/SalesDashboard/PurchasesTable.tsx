"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { StockPurchase } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type PurchasesTableProps = {
  purchases: StockPurchase[];
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const PurchasesTable: React.FC<PurchasesTableProps> = ({
  purchases,
  onDelete,
  deletingId,
}) => {
  if (!purchases.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No stock purchases recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Product</th>
            <th className="py-3 pr-3 font-medium">Variant</th>
            <th className="py-3 pr-3 font-medium">Qty</th>
            <th className="py-3 pr-3 font-medium">Unit Price</th>
            <th className="py-3 pr-3 font-medium">Total</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id} className="border-b border-[#f3f4f6]">
              <td className="py-3 pr-3">{purchase.date}</td>
              <td className="py-3 pr-3">{purchase.product}</td>
              <td className="py-3 pr-3">{purchase.variant}</td>
              <td className="py-3 pr-3">{purchase.qty}</td>
              <td className="py-3 pr-3">{money(purchase.unitPrice)}</td>
              <td className="py-3 pr-3 font-semibold">
                {money(purchase.totalCost)}
              </td>
              <td className="py-3">
                <Button
                  type="button"
                  onClick={() => onDelete(purchase.id)}
                  isLoading={deletingId === purchase.id}
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

export default PurchasesTable;
