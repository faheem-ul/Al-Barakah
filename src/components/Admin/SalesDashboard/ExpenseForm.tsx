"use client";

import React, { useState } from "react";

import { todayIsoDate } from "@/lib/sales/calculations";
import { Button } from "@/components/ui/button";

type ExpenseFormProps = {
  onSave: (draft: { name: string; amount: number; date: string }) => Promise<void>;
  saving: boolean;
};

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSave, saving }) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(todayIsoDate());

  const resetForm = () => {
    setName("");
    setAmount("");
    setDate(todayIsoDate());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      window.alert("Please enter an expense name.");
      return;
    }
    if (typeof amount !== "number" || amount <= 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    await onSave({
      name: name.trim(),
      amount,
      date,
    });

    resetForm();
  };

  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
      <h2 className="text-[19px] font-semibold mb-4">Add Expense</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Expense Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Fuel, Packaging"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Amount (Rs.)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value === "" ? "" : Number(e.target.value) || 0,
              )
            }
            placeholder="Expense amount"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        isLoading={saving}
        className="rounded-lg bg-black text-white px-5 py-2.5 text-[14px] hover:opacity-90"
      >
        Add Expense
      </Button>
    </div>
  );
};

export default ExpenseForm;
