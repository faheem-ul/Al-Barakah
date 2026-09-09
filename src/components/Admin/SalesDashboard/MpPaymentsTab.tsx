"use client";

import React, { useCallback, useMemo, useState } from "react";

import { currentMonthValue, money } from "@/lib/sales/calculations";
import {
  createCodSettlement,
  deleteCodSettlement,
} from "@/lib/sales/cod-settlements";
import type { CodSettlement } from "@/lib/sales/types";

import CodSettlementForm from "./CodSettlementForm";
import CodSettlementsTable from "./CodSettlementsTable";
import PaymentMonthFooter from "./PaymentMonthFooter";

type MpPaymentsTabProps = {
  codSettlements: CodSettlement[];
  onCodSettlementsChange: (settlements: CodSettlement[]) => void;
};

function filterByMonth(items: CodSettlement[], month: string): CodSettlement[] {
  return [...items]
    .filter((item) => String(item.date || "").startsWith(month))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const MpPaymentsTab: React.FC<MpPaymentsTabProps> = ({
  codSettlements,
  onCodSettlementsChange,
}) => {
  const [codMonth, setCodMonth] = useState(currentMonthValue());
  const [savingCod, setSavingCod] = useState(false);
  const [deletingCodId, setDeletingCodId] = useState<string | null>(null);

  const filteredCodSettlements = useMemo(
    () => filterByMonth(codSettlements, codMonth),
    [codSettlements, codMonth],
  );

  const codSummary = useMemo(() => {
    let totalReceived = 0;
    for (const settlement of filteredCodSettlements) {
      totalReceived += settlement.amount;
    }
    return {
      count: filteredCodSettlements.length,
      totalReceived,
    };
  }, [filteredCodSettlements]);

  const handleSaveCodSettlement = useCallback(
    async (draft: {
      date: string;
      amount: number;
      reference: string;
      note: string;
    }) => {
      setSavingCod(true);
      try {
        const payload = {
          date: draft.date,
          amount: draft.amount,
          reference: draft.reference,
          note: draft.note,
          createdAt: Date.now(),
        };

        const id = await createCodSettlement(payload);
        onCodSettlementsChange([{ id, ...payload }, ...codSettlements]);
        setCodMonth(draft.date.slice(0, 7));
        window.alert("COD settlement saved successfully.");
      } catch (error) {
        console.error("Failed to save COD settlement", error);
        window.alert("Failed to save COD settlement. Please try again.");
      } finally {
        setSavingCod(false);
      }
    },
    [codSettlements, onCodSettlementsChange],
  );

  const handleDeleteCodSettlement = async (id: string) => {
    if (!window.confirm("Delete this COD settlement record?")) return;
    setDeletingCodId(id);
    try {
      await deleteCodSettlement(id);
      onCodSettlementsChange(
        codSettlements.filter((settlement) => settlement.id !== id),
      );
    } catch (error) {
      console.error("Failed to delete COD settlement", error);
      window.alert("Failed to delete settlement. Please try again.");
    } finally {
      setDeletingCodId(null);
    }
  };

  return (
    <div>
      <CodSettlementForm onSave={handleSaveCodSettlement} saving={savingCod} />

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[19px] font-semibold">M&amp;P COD Received</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">
              Deposits received from M&amp;P for COD orders.
            </p>
          </div>
          <label className="block max-w-xs">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Filter by Month
            </span>
            <input
              type="month"
              value={codMonth}
              onChange={(e) => setCodMonth(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            {
              label: "Settlements",
              value: String(codSummary.count),
            },
            {
              label: "Total Received",
              value: money(codSummary.totalReceived),
              success: codSummary.totalReceived > 0,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4"
            >
              <p className="text-[13px] text-[#6b7280] mb-2">{card.label}</p>
              <p
                className={`text-[22px] font-bold ${
                  card.success ? "text-[#047857]" : "text-[#1f2937]"
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <CodSettlementsTable
          settlements={filteredCodSettlements}
          onDelete={handleDeleteCodSettlement}
          deletingId={deletingCodId}
        />

        <PaymentMonthFooter
          month={codMonth}
          onMonthChange={setCodMonth}
          count={filteredCodSettlements.length}
          emptyLabel="No COD settlements"
        />
      </div>
    </div>
  );
};

export default MpPaymentsTab;
