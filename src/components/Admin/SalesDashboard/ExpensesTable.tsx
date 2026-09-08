"use client";

import React from "react";

import { money } from "@/lib/sales/calculations";
import type { StockExpense } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type ExpensesTableProps = {
  expenses: StockExpense[];
  onDelete: (id: string) => void;
  deletingId: string | null;
};

const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  onDelete,
  deletingId,
}) => {
  if (!expenses.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280]">
        No expenses recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Name</th>
            <th className="py-3 pr-3 font-medium">Amount</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-[#f3f4f6]">
              <td className="py-3 pr-3">{expense.date}</td>
              <td className="py-3 pr-3">{expense.name}</td>
              <td className="py-3 pr-3 font-semibold">
                {money(expense.amount)}
              </td>
              <td className="py-3">
                <Button
                  type="button"
                  onClick={() => onDelete(expense.id)}
                  isLoading={deletingId === expense.id}
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

export default ExpensesTable;
