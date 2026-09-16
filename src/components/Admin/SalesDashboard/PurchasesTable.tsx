"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import { getWholesalerDisplayName } from "@/lib/sales/wholesalers";
import type { StockPurchase, WholesalerAccount } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type PurchasesTableProps = {
  purchases: StockPurchase[];
  wholesalers: WholesalerAccount[];
  editingId: string | null;
  onEdit: (purchase: StockPurchase) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const PurchasesTable: React.FC<PurchasesTableProps> = ({
  purchases,
  wholesalers,
  editingId,
  onEdit,
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
      <table className="w-full min-w-[860px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Wholesaler</th>
            <th className="py-3 pr-3 font-medium">Product</th>
            <th className="py-3 pr-3 font-medium">Variant</th>
            <th className="py-3 pr-3 font-medium">Qty</th>
            <th className="py-3 pr-3 font-medium">Unit Price</th>
            <th className="py-3 pr-3 font-medium">Total</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => {
            const wholesalerLabel = getWholesalerDisplayName(
              purchase.wholesalerId,
              wholesalers,
            );
            const isDeletedAccount = wholesalerLabel === "Deleted account";
            const isLegacy = wholesalerLabel === "------";

            return (
              <tr key={purchase.id} className="border-b border-[#f3f4f6]">
                <td className="py-3 pr-3">{purchase.date}</td>
                <td
                  className={`py-3 pr-3 ${
                    isDeletedAccount
                      ? "text-[#b91c1c]"
                      : isLegacy
                        ? "text-[#9ca3af]"
                        : ""
                  }`}
                >
                  {wholesalerLabel}
                </td>
                <td className="py-3 pr-3">{purchase.product}</td>
                <td className="py-3 pr-3">{purchase.variant}</td>
                <td className="py-3 pr-3">{purchase.qty}</td>
                <td className="py-3 pr-3">{money(purchase.unitPrice)}</td>
                <td className="py-3 pr-3 font-semibold">
                  {money(purchase.totalCost)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => onEdit(purchase)}
                      disabled={deletingId === purchase.id}
                      className="rounded-lg bg-[#f3f4f6] text-[#374151] px-3 py-1.5 text-[13px] hover:opacity-90 disabled:opacity-50"
                    >
                      {editingId === purchase.id ? "Editing" : "Edit"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(purchase.id)}
                      isLoading={deletingId === purchase.id}
                      disabled={editingId === purchase.id}
                      className="rounded-lg bg-[#fef2f2] text-[#b91c1c] px-3 py-1.5 text-[13px] hover:opacity-90 disabled:opacity-50"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PurchasesTable;
