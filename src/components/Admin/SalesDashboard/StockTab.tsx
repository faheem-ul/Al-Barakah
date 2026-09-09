"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { currentMonthValue, money } from "@/lib/sales/calculations";
import {
  createStockExpense,
  deleteStockExpense,
} from "@/lib/sales/expenses";
import {
  createStockPurchase,
  deleteStockPurchase,
} from "@/lib/sales/purchases";
import { getProductByKey } from "@/lib/sales/products";
import type { StockExpense, StockPurchase } from "@/lib/sales/types";

import ExpenseForm from "./ExpenseForm";
import ExpensesTable from "./ExpensesTable";
import PurchaseForm from "./PurchaseForm";
import PurchaseMonthTabs, {
  CURRENT_YEAR,
  getDefaultPurchaseMonth,
  getPurchaseMonthsWithData,
} from "./PurchaseMonthTabs";
import PurchasesTable from "./PurchasesTable";

type StockTabProps = {
  purchases: StockPurchase[];
  onPurchasesChange: (purchases: StockPurchase[]) => void;
  expenses: StockExpense[];
  onExpensesChange: (expenses: StockExpense[]) => void;
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
  expenses,
  onExpensesChange,
}) => {
  const [purchaseMonth, setPurchaseMonth] = useState(currentMonthValue());
  const [expenseMonth, setExpenseMonth] = useState(currentMonthValue());

  const purchaseMonthsWithData = useMemo(
    () => getPurchaseMonthsWithData(purchases),
    [purchases],
  );
  const purchaseMonthInitialized = useRef(false);

  useEffect(() => {
    if (purchaseMonthInitialized.current) return;
    purchaseMonthInitialized.current = true;
    setPurchaseMonth(getDefaultPurchaseMonth(purchases));
  }, [purchases]);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(
    null,
  );
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null,
  );

  const filteredPurchases = useMemo(
    () =>
      [...purchases]
        .filter((purchase) =>
          String(purchase.date || "").startsWith(purchaseMonth),
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [purchases, purchaseMonth],
  );

  const filteredExpenses = useMemo(
    () =>
      [...expenses]
        .filter((expense) =>
          String(expense.date || "").startsWith(expenseMonth),
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [expenses, expenseMonth],
  );

  const purchaseSummary = useMemo(() => {
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

  const expenseSummary = useMemo(() => {
    let totalAmount = 0;

    for (const expense of filteredExpenses) {
      totalAmount += expense.amount;
    }

    return {
      count: filteredExpenses.length,
      totalAmount,
    };
  }, [filteredExpenses]);

  const handleSavePurchase = useCallback(
    async (draft: {
      date: string;
      key: string;
      qty: number;
      unitPrice: number;
    }) => {
      setSavingPurchase(true);
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

        const savedMonth = draft.date.slice(0, 7);
        if (savedMonth.startsWith(String(CURRENT_YEAR))) {
          setPurchaseMonth(savedMonth);
        }

        window.alert("Purchase saved successfully.");
      } catch (error) {
        console.error("Failed to save purchase", error);
        window.alert("Failed to save purchase. Please try again.");
      } finally {
        setSavingPurchase(false);
      }
    },
    [purchases, onPurchasesChange],
  );

  const handleSaveExpense = useCallback(
    async (draft: { name: string; amount: number; date: string }) => {
      setSavingExpense(true);
      try {
        const payload = {
          name: draft.name,
          amount: draft.amount,
          date: draft.date,
          createdAt: Date.now(),
        };

        const id = await createStockExpense(payload);
        onExpensesChange([{ id, ...payload }, ...expenses]);
        window.alert("Expense saved successfully.");
      } catch (error) {
        console.error("Failed to save expense", error);
        window.alert("Failed to save expense. Please try again.");
      } finally {
        setSavingExpense(false);
      }
    },
    [expenses, onExpensesChange],
  );

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm("Delete this purchase record?")) return;
    setDeletingPurchaseId(id);
    try {
      const deleted = purchases.find((purchase) => purchase.id === id);
      const nextPurchases = purchases.filter((purchase) => purchase.id !== id);
      await deleteStockPurchase(id);
      onPurchasesChange(nextPurchases);

      if (
        deleted &&
        String(deleted.date || "").slice(0, 7) === purchaseMonth &&
        !nextPurchases.some((purchase) =>
          String(purchase.date || "").startsWith(purchaseMonth),
        )
      ) {
        setPurchaseMonth(getDefaultPurchaseMonth(nextPurchases));
      }
    } catch (error) {
      console.error("Failed to delete purchase", error);
      window.alert("Failed to delete purchase. Please try again.");
    } finally {
      setDeletingPurchaseId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Delete this expense record?")) return;
    setDeletingExpenseId(id);
    try {
      await deleteStockExpense(id);
      onExpensesChange(expenses.filter((expense) => expense.id !== id));
    } catch (error) {
      console.error("Failed to delete expense", error);
      window.alert("Failed to delete expense. Please try again.");
    } finally {
      setDeletingExpenseId(null);
    }
  };

  return (
    <div>
      <PurchaseForm onSave={handleSavePurchase} saving={savingPurchase} />

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <div className="mb-4">
          <h2 className="text-[19px] font-semibold mb-4">Purchase History</h2>
          <PurchaseMonthTabs
            selectedMonth={purchaseMonth}
            monthsWithData={purchaseMonthsWithData}
            onSelect={setPurchaseMonth}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Purchases", value: String(purchaseSummary.count) },
            { label: "Total Units", value: String(purchaseSummary.totalUnits) },
            { label: "Total Spend", value: money(purchaseSummary.totalSpend) },
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
          onDelete={handleDeletePurchase}
          deletingId={deletingPurchaseId}
        />

        <p className="mt-4 text-[13px] text-[#6b7280]">
          {filteredPurchases.length
            ? `${filteredPurchases.length} purchase${filteredPurchases.length === 1 ? "" : "s"} in ${formatMonthLabel(purchaseMonth)}`
            : `No purchases in ${formatMonthLabel(purchaseMonth)}`}
        </p>
      </div>

      <ExpenseForm onSave={handleSaveExpense} saving={savingExpense} />

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <h2 className="text-[19px] font-semibold">Expense History</h2>
          <label className="block max-w-xs">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Filter by Month
            </span>
            <input
              type="month"
              value={expenseMonth}
              onChange={(e) => setExpenseMonth(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { label: "Total Expenses", value: String(expenseSummary.count) },
            { label: "Total Amount", value: money(expenseSummary.totalAmount) },
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

        <ExpensesTable
          expenses={filteredExpenses}
          onDelete={handleDeleteExpense}
          deletingId={deletingExpenseId}
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#6b7280]">
            {filteredExpenses.length
              ? `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"} in ${formatMonthLabel(expenseMonth)}`
              : `No expenses in ${formatMonthLabel(expenseMonth)}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setExpenseMonth((current) => shiftMonth(current, -1))
              }
              aria-label="Previous month"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[140px] text-center text-[13px] font-medium text-[#374151]">
              {formatMonthLabel(expenseMonth)}
            </span>
            <button
              type="button"
              onClick={() =>
                setExpenseMonth((current) => shiftMonth(current, 1))
              }
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
