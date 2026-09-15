"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Store } from "lucide-react";

import { currentMonthValue, money } from "@/lib/sales/calculations";
import {
  createWholesaler,
  createWholesalerTransaction,
  deleteWholesalerTransaction,
  updateWholesaler,
} from "@/lib/sales/wholesalers";
import type {
  WholesalerAccount,
  WholesalerLedgerType,
  WholesalerTransaction,
} from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

import PaymentMonthFooter from "./PaymentMonthFooter";
import WholesalerEntryForm from "./WholesalerEntryForm";
import WholesalerLedgerTable from "./WholesalerLedgerTable";

type WholesalerPaymentsTabProps = {
  wholesalers: WholesalerAccount[];
  onWholesalersChange: (accounts: WholesalerAccount[]) => void;
  transactionsByWholesaler: Record<string, WholesalerTransaction[]>;
  onTransactionsByWholesalerChange: (
    next: Record<string, WholesalerTransaction[]>,
  ) => void;
};

function filterByMonth(
  items: WholesalerTransaction[],
  month: string,
): WholesalerTransaction[] {
  return [...items]
    .filter((item) => String(item.date || "").startsWith(month))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getWholesalerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function computeSummary(transactions: WholesalerTransaction[]) {
  let totalOwed = 0;
  let totalPaid = 0;

  for (const entry of transactions) {
    if (entry.type === "credit") totalOwed += entry.amount;
    else totalPaid += entry.amount;
  }

  return {
    totalOwed,
    totalPaid,
    balanceDue: totalOwed - totalPaid,
  };
}

const WholesalerPaymentsTab: React.FC<WholesalerPaymentsTabProps> = ({
  wholesalers,
  onWholesalersChange,
  transactionsByWholesaler,
  onTransactionsByWholesalerChange,
}) => {
  const [selectedWholesalerId, setSelectedWholesalerId] = useState("");
  const [wholesalerMonth, setWholesalerMonth] = useState(currentMonthValue());
  const [savingWholesalerType, setSavingWholesalerType] =
    useState<WholesalerLedgerType | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);
  const [newWholesalerName, setNewWholesalerName] = useState("");
  const [creatingWholesaler, setCreatingWholesaler] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [isRenamingWholesaler, setIsRenamingWholesaler] = useState(false);

  useEffect(() => {
    if (!wholesalers.length) {
      setSelectedWholesalerId("");
      return;
    }

    if (!selectedWholesalerId || !wholesalers.some((w) => w.id === selectedWholesalerId)) {
      setSelectedWholesalerId(wholesalers[0].id);
    }
  }, [wholesalers, selectedWholesalerId]);

  const selectedWholesaler = useMemo(
    () => wholesalers.find((w) => w.id === selectedWholesalerId) ?? null,
    [wholesalers, selectedWholesalerId],
  );

  useEffect(() => {
    setRenameValue(selectedWholesaler?.name ?? "");
    setIsRenamingWholesaler(false);
  }, [selectedWholesaler?.id, selectedWholesaler?.name]);

  const selectedTransactions = useMemo(
    () => transactionsByWholesaler[selectedWholesalerId] ?? [],
    [transactionsByWholesaler, selectedWholesalerId],
  );

  const filteredTransactions = useMemo(
    () => filterByMonth(selectedTransactions, wholesalerMonth),
    [selectedTransactions, wholesalerMonth],
  );

  const wholesalerSummary = useMemo(
    () => computeSummary(selectedTransactions),
    [selectedTransactions],
  );

  const handleCreateWholesaler = async () => {
    const name = newWholesalerName.trim();
    if (!name) {
      window.alert("Please enter a wholesaler name.");
      return;
    }

    setCreatingWholesaler(true);
    try {
      const account = await createWholesaler({
        name,
        createdAt: Date.now(),
      });
      onWholesalersChange(
        [...wholesalers, account].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
      );
      onTransactionsByWholesalerChange({
        ...transactionsByWholesaler,
        [account.id]: [],
      });
      setSelectedWholesalerId(account.id);
      setNewWholesalerName("");
      window.alert("Wholesaler account created.");
    } catch (error) {
      console.error("Failed to create wholesaler", error);
      window.alert("Failed to create wholesaler. Please try again.");
    } finally {
      setCreatingWholesaler(false);
    }
  };

  const startRename = () => {
    if (!selectedWholesaler) return;
    setRenameValue(selectedWholesaler.name);
    setIsRenamingWholesaler(true);
  };

  const handleCancelRename = () => {
    setRenameValue(selectedWholesaler?.name ?? "");
    setIsRenamingWholesaler(false);
  };

  const handleRenameWholesaler = async () => {
    if (!selectedWholesaler) return;

    const name = renameValue.trim();
    if (!name) {
      window.alert("Please enter a wholesaler name.");
      return;
    }

    if (name === selectedWholesaler.name) {
      setIsRenamingWholesaler(false);
      return;
    }

    setSavingRename(true);
    try {
      await updateWholesaler(selectedWholesaler.id, { name });
      onWholesalersChange(
        wholesalers.map((account) =>
          account.id === selectedWholesaler.id ? { ...account, name } : account,
        ),
      );
      setIsRenamingWholesaler(false);
      window.alert("Wholesaler name updated.");
    } catch (error) {
      console.error("Failed to rename wholesaler", error);
      window.alert("Failed to update wholesaler name. Please try again.");
    } finally {
      setSavingRename(false);
    }
  };

  const handleSaveTransaction = useCallback(
    async (draft: {
      type: WholesalerLedgerType;
      date: string;
      amount: number;
      note: string;
    }) => {
      if (!selectedWholesalerId) {
        window.alert("Please select or create a wholesaler first.");
        return;
      }

      setSavingWholesalerType(draft.type);
      try {
        const payload = {
          type: draft.type,
          date: draft.date,
          amount: draft.amount,
          note: draft.note,
          createdAt: Date.now(),
        };

        const id = await createWholesalerTransaction(selectedWholesalerId, payload);
        const nextEntry: WholesalerTransaction = { id, ...payload };
        onTransactionsByWholesalerChange({
          ...transactionsByWholesaler,
          [selectedWholesalerId]: [
            nextEntry,
            ...(transactionsByWholesaler[selectedWholesalerId] ?? []),
          ],
        });
        setWholesalerMonth(draft.date.slice(0, 7));
        window.alert(
          draft.type === "credit"
            ? "Amount owed recorded successfully."
            : "Payment recorded successfully.",
        );
      } catch (error) {
        console.error("Failed to save wholesaler transaction", error);
        window.alert("Failed to save entry. Please try again.");
      } finally {
        setSavingWholesalerType(null);
      }
    },
    [
      selectedWholesalerId,
      transactionsByWholesaler,
      onTransactionsByWholesalerChange,
    ],
  );

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!selectedWholesalerId) return;
    if (!window.confirm("Delete this wholesaler ledger entry?")) return;

    setDeletingTransactionId(transactionId);
    try {
      await deleteWholesalerTransaction(selectedWholesalerId, transactionId);
      onTransactionsByWholesalerChange({
        ...transactionsByWholesaler,
        [selectedWholesalerId]: (transactionsByWholesaler[selectedWholesalerId] ?? []).filter(
          (entry) => entry.id !== transactionId,
        ),
      });
    } catch (error) {
      console.error("Failed to delete wholesaler transaction", error);
      window.alert("Failed to delete entry. Please try again.");
    } finally {
      setDeletingTransactionId(null);
    }
  };

  return (
    <div>
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold">Wholesaler Payables</h2>
        <p className="text-[13px] text-[#6b7280] mt-1 mb-4">
          Select a wholesaler account — credits add to balance, payments reduce it.
        </p>

        <div className="mb-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] mb-3">
              Active Wholesaler
            </p>

            {!selectedWholesaler ? (
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-[#d1d5db] bg-white px-4 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1f2937]">
                    No wholesaler selected
                  </p>
                  <p className="text-[13px] text-[#6b7280] mt-1">
                    Add a wholesaler account to start recording credits and
                    payments.
                  </p>
                </div>
              </div>
            ) : isRenamingWholesaler ? (
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <p className="text-[13px] text-[#6b7280] mb-2">
                  Rename account
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Wholesaler name"
                    className="min-w-[200px] flex-1 rounded-lg border border-[#e5e7eb] px-3 py-2.5 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1f2937]/10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameWholesaler();
                      if (e.key === "Escape") handleCancelRename();
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleRenameWholesaler}
                    isLoading={savingRename}
                    className="rounded-lg bg-[#1f2937] text-white px-4 py-2.5 text-[14px] hover:opacity-90"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancelRename}
                    disabled={savingRename}
                    className="rounded-lg border border-[#e5e7eb] bg-white text-[#374151] px-4 py-2.5 text-[14px] hover:bg-[#f9fafb] disabled:opacity-60"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-[13px] font-semibold text-white">
                  {getWholesalerInitials(selectedWholesaler.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="truncate text-[17px] font-semibold text-[#1f2937]">
                      {selectedWholesaler.name}
                    </h3>
                    <button
                      type="button"
                      onClick={startRename}
                      aria-label="Edit wholesaler name"
                      title="Rename account"
                      className="shrink-0 rounded-md p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p
                    className={`text-[13px] mt-0.5 ${
                      wholesalerSummary.balanceDue > 0
                        ? "text-[#b45309] font-medium"
                        : "text-[#047857]"
                    }`}
                  >
                    Balance due: {money(wholesalerSummary.balanceDue)}
                  </p>
                </div>
              </div>
            )}

            {wholesalers.length > 1 && !isRenamingWholesaler && (
              <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
                <label className="block">
                  <span className="text-[12px] text-[#6b7280] mb-1.5 block">
                    Switch account
                  </span>
                  <div className="relative">
                    <select
                      value={selectedWholesalerId}
                      onChange={(e) => setSelectedWholesalerId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#e5e7eb] bg-white py-2.5 pl-3 pr-9 text-[14px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#1f2937]/10"
                    >
                      {wholesalers.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5e7eb] text-[#1f2937]">
                <Plus className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#1f2937]">
                New Account
              </h3>
            </div>
            <p className="text-[12px] text-[#6b7280] mb-3">
              Create another wholesaler to track separate payables.
            </p>
            <div className="space-y-2">
              <input
                value={newWholesalerName}
                onChange={(e) => setNewWholesalerName(e.target.value)}
                placeholder="Wholesaler name"
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2.5 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1f2937]/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateWholesaler();
                }}
              />
              <Button
                type="button"
                onClick={handleCreateWholesaler}
                isLoading={creatingWholesaler}
                className="w-full rounded-lg bg-[#1f2937] text-white px-4 py-2.5 text-[14px] hover:opacity-90"
              >
                Add Wholesaler
              </Button>
            </div>
          </div>
        </div>

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
            wholesalerName={selectedWholesaler?.name ?? ""}
            disabled={!selectedWholesaler}
            onSave={handleSaveTransaction}
            saving={savingWholesalerType === "credit"}
          />
          <WholesalerEntryForm
            entryType="payment"
            wholesalerName={selectedWholesaler?.name ?? ""}
            disabled={!selectedWholesaler}
            onSave={handleSaveTransaction}
            saving={savingWholesalerType === "payment"}
          />
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[19px] font-semibold">Wholesaler Ledger</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">
              Credit and payment history for{" "}
              {selectedWholesaler?.name ?? "selected wholesaler"}.
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
          entries={filteredTransactions}
          onDelete={handleDeleteTransaction}
          deletingId={deletingTransactionId}
        />

        <PaymentMonthFooter
          month={wholesalerMonth}
          onMonthChange={setWholesalerMonth}
          count={filteredTransactions.length}
          emptyLabel="No wholesaler entries"
        />
      </div>
    </div>
  );
};

export default WholesalerPaymentsTab;
