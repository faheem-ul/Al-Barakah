"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import Text from "@/components/ui/Text";

import { type VoucherEmailFilterTab } from "./constants";
import VoucherEmailFilterSheet from "./VoucherEmailFilterSheet";
import VoucherEmailFilters from "./VoucherEmailFilters";
import CodeUsageBadge from "./CodeUsageBadge";
import VoucherEmailStatusBadge from "./VoucherEmailStatusBadge";

type VoucherEmailRow = {
  id: string;
  status: "pending" | "sent" | "failed";
  email: string;
  orderNumber: string;
  discountCode?: string;
  codeUsed?: boolean | null;
  emailError?: string;
  createdAt?: string;
  sentAt?: string;
  failedAt?: string;
};

type ListResponse = {
  items?: VoucherEmailRow[];
  error?: string;
};

function displayDate(row: VoucherEmailRow): string {
  const iso = row.sentAt || row.failedAt || row.createdAt;
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function truncate(text: string, max = 64): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

type VoucherEmailHistoryTabProps = {
  getToken: () => Promise<string | null>;
};

const VoucherEmailHistoryTab: React.FC<VoucherEmailHistoryTabProps> = ({
  getToken,
}) => {
  const [items, setItems] = useState<VoucherEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VoucherEmailFilterTab>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setItems([]);
        return;
      }

      const params = new URLSearchParams({ limit: "100" });
      const response = await fetch(
        `/api/admin/loyalty-voucher-sends?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await response.json().catch(() => null)) as
        | ListResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Could not load voucher emails.");
      }

      setItems(data?.items ?? []);
    } catch (error) {
      console.error("Failed to load loyalty voucher sends", error);
      toast.error("Could not load voucher email history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const tally = { all: items.length, sent: 0, failed: 0, pending: 0 };
    for (const row of items) {
      if (row.status === "sent") tally.sent += 1;
      else if (row.status === "failed") tally.failed += 1;
      else if (row.status === "pending") tally.pending += 1;
    }
    return tally;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((row) => row.status === filter);
  }, [items, filter]);

  const syncGmailBounces = async () => {
    setSyncingGmail(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in again.");
        return;
      }

      const response = await fetch("/api/admin/gmail-bounce-sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ maxMessages: 30 }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        updated?: number;
        matched?: number;
        scanned?: number;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Gmail sync failed.");
      }

      if (data?.updated && data.updated > 0) {
        toast.success(
          `Updated ${data.updated} voucher row(s) from Gmail bounces.`,
        );
        await load();
      } else {
        toast.message(
          data?.scanned
            ? `Checked ${data.scanned} bounce message(s); no sent vouchers to update.`
            : "No new Gmail bounces to process.",
        );
      }
    } catch (error) {
      console.error("Gmail bounce sync failed", error);
      toast.error(
        error instanceof Error ? error.message : "Gmail bounce sync failed.",
      );
    } finally {
      setSyncingGmail(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start gap-2 mb-2 md:mb-0">
        <div className="flex-1 min-w-0">
          <VoucherEmailFilters
            filter={filter}
            statusCounts={statusCounts}
            onFilterChange={setFilter}
            onOpenStatusSheet={() => setFilterSheetOpen(true)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="hidden md:inline-flex shrink-0 mb-6"
          onClick={() => void syncGmailBounces()}
          disabled={syncingGmail || loading}
        >
          {syncingGmail ? "Syncing Gmail…" : "Sync Gmail bounces"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="hidden md:inline-flex shrink-0 mb-6"
          onClick={() => load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="md:hidden flex flex-col gap-2 mb-4">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void syncGmailBounces()}
          disabled={syncingGmail || loading}
        >
          {syncingGmail ? "Syncing Gmail…" : "Sync Gmail bounces"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <VoucherEmailFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filter={filter}
        statusCounts={statusCounts}
        onSelect={(id) => {
          setFilter(id);
          setFilterSheetOpen(false);
        }}
      />

      <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
        <Text className="text-[16px] font-semibold text-black mb-1">
          Loyalty coupon delivery
        </Text>
        <Text className="text-[13px] text-[#6B6B6B] mb-4">
          Customer voucher emails from paid Shopify orders. Failed rows keep
          the discount code — fix the email on Send vouchers and resend. With
          Gmail SMTP, use Sync Gmail bounces (same inbox as SMTP_USER) after
          you see a mailer-daemon failure.
        </Text>

        {loading ? (
          <Text className="text-[13px] text-[#6B6B6B]">Loading…</Text>
        ) : filteredItems.length === 0 ? (
          <Text className="text-[13px] text-[#6B6B6B]">
            {items.length === 0
              ? "No voucher email records yet."
              : "No records match this filter."}
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-[#6B6B6B]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 pr-3 font-semibold">Code status</th>
                  <th className="py-2 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => (
                  <tr key={row.id} className="border-b border-black/5">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-[#6B6B6B]">
                      {displayDate(row)}
                    </td>
                    <td className="py-2.5 pr-3 text-black whitespace-nowrap">
                      {row.orderNumber || `#${row.id}`}
                    </td>
                    <td className="py-2.5 pr-3 text-black break-all">
                      {row.email || "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <VoucherEmailStatusBadge status={row.status} />
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-black">
                      {row.discountCode || "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.codeUsed == null ? (
                        <span className="text-[#6B6B6B]">—</span>
                      ) : (
                        <CodeUsageBadge used={row.codeUsed} />
                      )}
                    </td>
                    <td
                      className="py-2.5 text-[#b42318] max-w-[280px]"
                      title={row.emailError || undefined}
                    >
                      {row.emailError ? truncate(row.emailError) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default VoucherEmailHistoryTab;
