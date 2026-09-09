"use client";

import React, { useState } from "react";

import { todayIsoDate } from "@/lib/sales/calculations";
import type { WholesalerLedgerType } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type WholesalerEntryFormProps = {
  entryType: WholesalerLedgerType;
  onSave: (draft: {
    type: WholesalerLedgerType;
    date: string;
    amount: number;
    note: string;
  }) => Promise<void>;
  saving: boolean;
};

const FORM_COPY: Record<
  WholesalerLedgerType,
  { title: string; subtitle: string; button: string; notePlaceholder: string }
> = {
  credit: {
    title: "Add Credit",
    subtitle: "Honey purchased on credit from wholesaler.",
    button: "Save Credit",
    notePlaceholder: "Notes",
  },
  payment: {
    title: "Record Payment",
    subtitle: "Amount paid to wholesaler.",
    button: "Save Payment",
    notePlaceholder: "Notes",
  },
};

const WholesalerEntryForm: React.FC<WholesalerEntryFormProps> = ({
  entryType,
  onSave,
  saving,
}) => {
  const copy = FORM_COPY[entryType];
  const [date, setDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState<number | "">("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    setDate(todayIsoDate());
    setAmount("");
    setNote("");
  };

  const handleSave = async () => {
    if (typeof amount !== "number" || amount <= 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    await onSave({
      type: entryType,
      date,
      amount,
      note: note.trim(),
    });

    resetForm();
  };

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
      <h3 className="text-[16px] font-semibold">{copy.title}</h3>
      <p className="text-[12px] text-[#6b7280] mt-1 mb-4">{copy.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 bg-white"
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
            placeholder="Amount"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 bg-white"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Note
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.notePlaceholder}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 bg-white"
          />
        </label>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        isLoading={saving}
        className={`rounded-lg px-5 py-2.5 text-[14px] hover:opacity-90 text-white ${
          entryType === "credit" ? "bg-[#b45309]" : "bg-[#047857]"
        }`}
      >
        {copy.button}
      </Button>
    </div>
  );
};

export default WholesalerEntryForm;
