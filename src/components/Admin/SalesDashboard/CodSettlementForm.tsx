"use client";

import React, { useState } from "react";

import { todayIsoDate } from "@/lib/sales/calculations";
import { Button } from "@/components/ui/button";

type CodSettlementFormProps = {
  onSave: (draft: {
    date: string;
    amount: number;
    reference: string;
    note: string;
  }) => Promise<void>;
  saving: boolean;
};

const CodSettlementForm: React.FC<CodSettlementFormProps> = ({
  onSave,
  saving,
}) => {
  const [date, setDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    setDate(todayIsoDate());
    setAmount("");
    setReference("");
    setNote("");
  };

  const handleSave = async () => {
    if (typeof amount !== "number" || amount <= 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    await onSave({
      date,
      amount,
      reference: reference.trim(),
      note: note.trim(),
    });

    resetForm();
  };

  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
      <h2 className="text-[19px] font-semibold">Add COD Settlement</h2>
      <p className="text-[13px] text-[#6b7280] mt-1 mb-4">
        Log each M&amp;P deposit for collected COD orders.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            placeholder="Settlement amount"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Reference
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Note
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notes"
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
        Save Settlement
      </Button>
    </div>
  );
};

export default CodSettlementForm;
