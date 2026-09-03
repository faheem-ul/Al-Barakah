"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { currentMonthValue, money } from "@/lib/sales/calculations";
import {
  createStockPurchase,
  deleteStockPurchase,
} from "@/lib/sales/purchases";
import { getProductByKey } from "@/lib/sales/products";
import type { StockPurchase } from "@/lib/sales/types";

import PurchaseForm from "./PurchaseForm";
import PurchasesTable from "./PurchasesTable";

type StockTabProps = {
  purchases: StockPurchase[];
  onPurchasesChange: (purchases: StockPurchase[]) => void;
};

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

const StockTab: React.FC<StockTabProps> = ({
  purchases,
  onPurchasesChange,
}) => {
  const [month, setMonth] = useState(currentMonthValue());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPurchases = useMemo(
    () =>
      [...purchases]
        .filter((purchase) => String(purchase.date || "").startsWith(month))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [purchases, month],
  );

  const summary = useMemo(() => {
    let totalUnits = 0;
    let totalSpend = 0;

    for (const purchase of filteredPurchases) {
      totalUnits += purchase.qty;
      totalSpend += purchase.totalCost;
    }

    return {
      count: filteredPurchases.length,
      totalUnits,
      totalSpend,
    };
  }, [filteredPurchases]);

  const handleSave = useCallback(
    async (draft: {
      date: string;
      key: string;
      qty: number;
      unitPrice: number;
    }) => {
      setSaving(true);
      try {
        const product = getProductByKey(draft.key);
        if (!product) {
          window.alert("Invalid product selected.");
          return;
        }

        const payload = {
          date: draft.date,
          product: product.product,
          variant: product.variant,
          key: product.key,
          qty: draft.qty,
          unitPrice: draft.unitPrice,
          totalCost: draft.qty * draft.unitPrice,
          createdAt: Date.now(),
        };

        const id = await createStockPurchase(payload);
        onPurchasesChange([{ id, ...payload }, ...purchases]);
        window.alert("Purchase saved successfully.");
      } catch (error) {
        console.error("Failed to save purchase", error);
        window.alert("Failed to save purchase. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [purchases, onPurchasesChange],
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this purchase record?")) return;
    setDeletingId(id);
    try {
      await deleteStockPurchase(id);
      onPurchasesChange(purchases.filter((purchase) => purchase.id !== id));
    } catch (error) {
      console.error("Failed to delete purchase", error);
      window.alert("Failed to delete purchase. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PurchaseForm onSave={handleSave} saving={saving} />

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <h2 className="text-[19px] font-semibold">Purchase History</h2>
          <label className="block max-w-xs">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Filter by Month
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Purchases", value: String(summary.count) },
            { label: "Total Units", value: String(summary.totalUnits) },
            { label: "Total Spend", value: money(summary.totalSpend) },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4"
            >
              <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
              <p className="text-[22px] font-bold text-[#1f2937]">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <PurchasesTable
          purchases={filteredPurchases}
          onDelete={handleDelete}
          deletingId={deletingId}
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#6b7280]">
            {filteredPurchases.length
              ? `${filteredPurchases.length} purchase${filteredPurchases.length === 1 ? "" : "s"} in ${formatMonthLabel(month)}`
              : `No purchases in ${formatMonthLabel(month)}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
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
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              aria-label="Next month"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTab;
