"use client";

import React, { useCallback, useMemo, useState } from "react";

import { currentMonthValue, money } from "@/lib/sales/calculations";
import {
  createWholesalerEntry,
  deleteWholesalerEntry,
} from "@/lib/sales/wholesaler-ledger";
import type { WholesalerLedgerEntry, WholesalerLedgerType } from "@/lib/sales/types";

import PaymentMonthFooter from "./PaymentMonthFooter";
import WholesalerEntryForm from "./WholesalerEntryForm";
import WholesalerLedgerTable from "./WholesalerLedgerTable";

type WholesalerPaymentsTabProps = {
  wholesalerLedger: WholesalerLedgerEntry[];
  onWholesalerLedgerChange: (entries: WholesalerLedgerEntry[]) => void;
};

function filterByMonth(
  items: WholesalerLedgerEntry[],
  month: string,
): WholesalerLedgerEntry[] {
  return [...items]
    .filter((item) => String(item.date || "").startsWith(month))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const WholesalerPaymentsTab: React.FC<WholesalerPaymentsTabProps> = ({
  wholesalerLedger,
  onWholesalerLedgerChange,
}) => {
  const [wholesalerMonth, setWholesalerMonth] = useState(currentMonthValue());
  const [savingWholesalerType, setSavingWholesalerType] =
    useState<WholesalerLedgerType | null>(null);
  const [deletingWholesalerId, setDeletingWholesalerId] = useState<
    string | null
  >(null);

  const filteredWholesalerEntries = useMemo(
    () => filterByMonth(wholesalerLedger, wholesalerMonth),
    [wholesalerLedger, wholesalerMonth],
  );

  const wholesalerSummary = useMemo(() => {
    let totalOwed = 0;
    let totalPaid = 0;

    for (const entry of wholesalerLedger) {
      if (entry.type === "credit") totalOwed += entry.amount;
      else totalPaid += entry.amount;
    }

    return {
      totalOwed,
      totalPaid,
      balanceDue: totalOwed - totalPaid,
    };
  }, [wholesalerLedger]);

  const handleSaveWholesalerEntry = useCallback(
    async (draft: {
      type: WholesalerLedgerType;
      date: string;
      amount: number;
      note: string;
    }) => {
      setSavingWholesalerType(draft.type);
      try {
        const payload = {
          type: draft.type,
          date: draft.date,
          amount: draft.amount,
          note: draft.note,
          createdAt: Date.now(),
        };

        const id = await createWholesalerEntry(payload);
        onWholesalerLedgerChange([{ id, ...payload }, ...wholesalerLedger]);
        setWholesalerMonth(draft.date.slice(0, 7));
        window.alert(
          draft.type === "credit"
            ? "Amount owed recorded successfully."
            : "Payment recorded successfully.",
        );
      } catch (error) {
        console.error("Failed to save wholesaler entry", error);
        window.alert("Failed to save entry. Please try again.");
      } finally {
        setSavingWholesalerType(null);
      }
    },
    [wholesalerLedger, onWholesalerLedgerChange],
  );

  const handleDeleteWholesalerEntry = async (id: string) => {
    if (!window.confirm("Delete this wholesaler ledger entry?")) return;
    setDeletingWholesalerId(id);
    try {
      await deleteWholesalerEntry(id);
      onWholesalerLedgerChange(
        wholesalerLedger.filter((entry) => entry.id !== id),
      );
    } catch (error) {
      console.error("Failed to delete wholesaler entry", error);
      window.alert("Failed to delete entry. Please try again.");
    } finally {
      setDeletingWholesalerId(null);
    }
  };

  return (
    <div>
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold">Wholesaler Payables</h2>
        <p className="text-[13px] text-[#6b7280] mt-1 mb-4">
          Supplier account — credits add to balance, payments reduce it.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            {
              label: "Total Owed",
              value: money(wholesalerSummary.totalOwed),
            },
            {
              label: "Total Paid",
              value: money(wholesalerSummary.totalPaid),
              success: wholesalerSummary.totalPaid > 0,
            },
            {
              label: "Balance Due",
              value: money(wholesalerSummary.balanceDue),
              danger: wholesalerSummary.balanceDue > 0,
              success: wholesalerSummary.balanceDue <= 0,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4"
            >
              <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
              <p
                className={`text-[22px] font-bold ${
                  card.danger
                    ? "text-[#b91c1c]"
                    : card.success
                      ? "text-[#047857]"
                      : "text-[#1f2937]"
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <WholesalerEntryForm
            entryType="credit"
            onSave={handleSaveWholesalerEntry}
            saving={savingWholesalerType === "credit"}
          />
          <WholesalerEntryForm
            entryType="payment"
            onSave={handleSaveWholesalerEntry}
            saving={savingWholesalerType === "payment"}
          />
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[19px] font-semibold">Wholesaler Ledger</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">
              Credit and payment history.
            </p>
          </div>
          <label className="block max-w-xs">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Filter by Month
            </span>
            <input
              type="month"
              value={wholesalerMonth}
              onChange={(e) => setWholesalerMonth(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            />
          </label>
        </div>

        <WholesalerLedgerTable
          entries={filteredWholesalerEntries}
          onDelete={handleDeleteWholesalerEntry}
          deletingId={deletingWholesalerId}
        />

        <PaymentMonthFooter
          month={wholesalerMonth}
          onMonthChange={setWholesalerMonth}
          count={filteredWholesalerEntries.length}
          emptyLabel="No wholesaler entries"
        />
      </div>
    </div>
  );
};

export default WholesalerPaymentsTab;
