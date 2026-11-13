"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

import CodeUsageBadge from "./CodeUsageBadge";
import VoucherEmailStatusBadge from "./VoucherEmailStatusBadge";

type ManualSendRow = {
  shopifyOrderId: number;
  orderNumber: string;
  orderName: string;
  email: string;
  customerName: string;
  customerPhone: string;
  shopifyCustomerId: string | null;
  createdAt: string | null;
  orderTotalPkr: number;
  tierAmount: number | null;
  eligible: boolean;
  ineligibleReason: string | null;
  voucherStatus: "none" | "pending" | "sent" | "failed";
  discountCode: string | null;
  codeUsed: boolean | null;
  emailError: string | null;
};

type OrdersResponse = {
  items?: ManualSendRow[];
  nextCursor?: string | null;
  hasMore?: boolean;
  error?: string;
  details?: string;
};

type SendResponse = {
  ok?: boolean;
  sent?: boolean;
  skipReason?: string;
  emailError?: string;
  tierCode?: string | null;
  error?: string;
};

type ViewFilter = "all" | "eligible" | "not_sent";

const VIEW_FILTERS: { id: ViewFilter; label: string }[] = [
  { id: "all", label: "All paid" },
  { id: "eligible", label: "Eligible" },
  { id: "not_sent", label: "Not sent" },
];

function formatMoney(pkr: number): string {
  return `Rs ${Math.round(pkr).toLocaleString("en-PK")}`;
}

function formatOrderDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

type SendVouchersTabProps = {
  getToken: () => Promise<string | null>;
};

const ORDERS_PAGE_SIZE = 50;

const actionButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-black/15 bg-white px-3 py-1.5 text-[12px] font-medium text-black transition-colors hover:border-black/40 disabled:cursor-not-allowed disabled:opacity-50";

const SendVouchersTab: React.FC<SendVouchersTabProps> = ({ getToken }) => {
  const [items, setItems] = useState<ManualSendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("not_sent");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const cursorsRef = useRef<(string | null)[]>([null]);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [emailDrafts, setEmailDrafts] = useState<Record<number, string>>({});
  const [customerIdDrafts, setCustomerIdDrafts] = useState<
    Record<number, string>
  >({});
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>({});
  const [phoneDrafts, setPhoneDrafts] = useState<Record<number, string>>({});

  const rowEmail = (row: ManualSendRow) =>
    (emailDrafts[row.shopifyOrderId] ?? row.email).trim();

  const rowCustomerName = (row: ManualSendRow) =>
    (nameDrafts[row.shopifyOrderId] ?? row.customerName ?? "").trim();

  const rowCustomerPhone = (row: ManualSendRow) =>
    (phoneDrafts[row.shopifyOrderId] ?? row.customerPhone ?? "").trim();

  const rowCustomerId = (row: ManualSendRow) =>
    (customerIdDrafts[row.shopifyOrderId] ?? row.shopifyCustomerId ?? "").trim();

  const fetchPage = useCallback(
    async (targetPage: number, cursor: string | null) => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setItems([]);
          setHasMore(false);
          return;
        }

        const params = new URLSearchParams({
          limit: String(ORDERS_PAGE_SIZE),
          filter: viewFilter,
        });
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(
          `/api/admin/loyalty-manual-send/orders?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await response.json().catch(() => null)) as
          | OrdersResponse
          | null;

        if (!response.ok) {
          const detail = data?.details?.trim();
          throw new Error(
            detail || data?.error || "Could not load orders.",
          );
        }

        const rows = data?.items ?? [];
        setItems(rows);
        setHasMore(Boolean(data?.hasMore));
        setPage(targetPage);

        if (data?.hasMore && data.nextCursor) {
          cursorsRef.current[targetPage] = data.nextCursor;
        }
      } catch (error) {
        console.error("Failed to load manual send orders", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load paid orders.",
        );
        setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [getToken, viewFilter],
  );

  const reload = useCallback(async () => {
    cursorsRef.current = [null];
    await fetchPage(1, null);
  }, [fetchPage]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const goNext = useCallback(async () => {
    if (!hasMore) return;
    const cursor = cursorsRef.current[page] ?? null;
    if (!cursor) return;
    await fetchPage(page + 1, cursor);
  }, [fetchPage, hasMore, page]);

  const goPrev = useCallback(async () => {
    if (page <= 1) return;
    const cursor = cursorsRef.current[page - 2] ?? null;
    await fetchPage(page - 1, cursor);
  }, [fetchPage, page]);

  const rangeStart = items.length ? (page - 1) * ORDERS_PAGE_SIZE + 1 : 0;
  const rangeEnd = (page - 1) * ORDERS_PAGE_SIZE + items.length;

  // Filtering happens server-side; this only drops rows just sent on this page.
  const filteredItems = useMemo(() => {
    if (viewFilter !== "not_sent") return items;
    return items.filter((row) => row.voucherStatus !== "sent");
  }, [items, viewFilter]);

  const sendVoucher = async (row: ManualSendRow) => {
    if (!row.eligible || row.voucherStatus === "sent") return;

    const email = rowEmail(row);
    if (!email) {
      toast.error("Enter the customer email for this order.");
      return;
    }

    const confirmed = window.confirm(
      `Send loyalty voucher email for order ${row.orderName} to ${email}?`,
    );
    if (!confirmed) return;

    setBusyOrderId(row.shopifyOrderId);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in again.");
        return;
      }

      const response = await fetch("/api/admin/loyalty-manual-send/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopifyOrderId: row.shopifyOrderId,
          email,
          shopifyCustomerId: rowCustomerId(row) || undefined,
          customerName: rowCustomerName(row) || undefined,
          customerPhone: rowCustomerPhone(row) || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | SendResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Send failed.");
      }

      if (data?.sent) {
        toast.success(
          data.tierCode
            ? `Voucher sent — code ${data.tierCode}`
            : "Voucher email sent.",
        );
      } else if (data?.skipReason === "already_sent") {
        toast.message("Voucher was already sent for this order.");
      } else {
        toast.error(
          data?.emailError ||
            data?.skipReason ||
            "Could not send voucher email.",
        );
      }

      reload();
    } catch (error) {
      console.error("Manual loyalty send failed", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send voucher.",
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <>
      <div className="hidden md:flex flex-wrap gap-2 mb-6">
        {VIEW_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewFilter(tab.id)}
            className={cn(
              "px-4 py-2 text-[14px] font-medium rounded-md border transition-colors cursor-pointer",
              viewFilter === tab.id
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black/15 hover:border-black/40",
            )}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            "ml-auto px-4 py-2 text-[14px] font-medium rounded-md border transition-colors cursor-pointer",
            "bg-white text-black border-black/15 hover:border-black/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          onClick={() => void reload()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="md:hidden flex flex-wrap gap-2 mb-4">
        {VIEW_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewFilter(tab.id)}
            className={cn(
              "px-3 py-2 text-[13px] font-medium rounded-md border",
              viewFilter === tab.id
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black/15",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
        <Text className="text-[16px] font-semibold text-black mb-1">
          Send vouchers manually
        </Text>
        <Text className="text-[13px] text-[#6B6B6B] mb-4">
          Paid orders from Shopify (totals only). Email, name, and phone come
          from your ops Google Sheet or manual entry — not from Shopify Customer
          API on your plan. Shopify customer ID is filled by matching the email
          against the imported customers CSV, or enter it
          manually.
        </Text>

        {loading && items.length === 0 ? (
          <Text className="text-[13px] text-[#6B6B6B]">Loading…</Text>
        ) : filteredItems.length === 0 ? (
          <Text className="text-[13px] text-[#6B6B6B]">
            {items.length === 0
              ? viewFilter === "all"
                ? "No paid orders loaded."
                : "No orders match this filter."
              : "No orders match this filter on this page."}
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-[#6B6B6B]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Phone</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Customer ID</th>
                  <th className="py-2 pr-3 font-semibold">Total</th>
                  <th className="py-2 pr-3 font-semibold">Tier</th>
                  <th className="py-2 pr-3 font-semibold">Voucher</th>
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => {
                  const label =
                    row.voucherStatus === "failed" ? "Resend" : "Send";
                  const isBusy = busyOrderId === row.shopifyOrderId;

                  return (
                    <tr key={row.shopifyOrderId} className="border-b border-black/5">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-[#6B6B6B]">
                        {formatOrderDate(row.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3 text-black whitespace-nowrap">
                        {row.orderName}
                      </td>
                      <td className="py-2.5 pr-3 min-w-[120px]">
                        <input
                          type="text"
                          value={
                            nameDrafts[row.shopifyOrderId] ??
                            row.customerName ??
                            ""
                          }
                          onChange={(e) =>
                            setNameDrafts((prev) => ({
                              ...prev,
                              [row.shopifyOrderId]: e.target.value,
                            }))
                          }
                          placeholder="From sheet"
                          title="Customer name (Google Sheet Name column)"
                          className="w-full min-w-[100px] rounded-md border border-black/15 px-2 py-1.5 text-[12px]"
                        />
                      </td>
                      <td className="py-2.5 pr-3 min-w-[110px]">
                        <input
                          type="text"
                          value={
                            phoneDrafts[row.shopifyOrderId] ??
                            row.customerPhone ??
                            ""
                          }
                          onChange={(e) =>
                            setPhoneDrafts((prev) => ({
                              ...prev,
                              [row.shopifyOrderId]: e.target.value,
                            }))
                          }
                          placeholder="From sheet"
                          title="Contact phone (Google Sheet Contact column)"
                          className="w-full min-w-[90px] rounded-md border border-black/15 px-2 py-1.5 text-[12px]"
                        />
                      </td>
                      <td className="py-2.5 pr-3 min-w-[160px]">
                        <input
                          type="email"
                          value={emailDrafts[row.shopifyOrderId] ?? row.email}
                          onChange={(e) =>
                            setEmailDrafts((prev) => ({
                              ...prev,
                              [row.shopifyOrderId]: e.target.value,
                            }))
                          }
                          placeholder="Enter email if empty"
                          title={
                            row.voucherStatus === "failed" && row.emailError
                              ? row.emailError
                              : undefined
                          }
                          className={cn(
                            "w-full min-w-[140px] rounded-md border px-2 py-1.5 text-[12px]",
                            row.voucherStatus === "failed"
                              ? "border-[#fecdca] bg-[#fffbfb]"
                              : "border-black/15",
                          )}
                        />
                        {row.voucherStatus === "failed" && row.emailError ? (
                          <p
                            className="mt-1 text-[11px] leading-snug text-[#b42318] max-w-[200px]"
                            title={row.emailError}
                          >
                            {row.emailError.length > 96
                              ? `${row.emailError.slice(0, 96)}…`
                              : row.emailError}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3 min-w-[100px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            customerIdDrafts[row.shopifyOrderId] ??
                            row.shopifyCustomerId ??
                            ""
                          }
                          onChange={(e) =>
                            setCustomerIdDrafts((prev) => ({
                              ...prev,
                              [row.shopifyOrderId]: e.target.value,
                            }))
                          }
                          placeholder="Shopify ID"
                          title="Numeric customer ID from Shopify order page"
                          className="w-full min-w-[80px] rounded-md border border-black/15 px-2 py-1.5 text-[12px] font-mono"
                        />
                      </td>
                      <td className="py-2.5 pr-3 text-black whitespace-nowrap">
                        {formatMoney(row.orderTotalPkr)}
                      </td>
                      <td className="py-2.5 pr-3 text-black whitespace-nowrap">
                        {row.tierAmount ? formatMoney(row.tierAmount) : "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.voucherStatus === "none" ? (
                          <span className="text-[#6B6B6B]">None</span>
                        ) : (
                          <VoucherEmailStatusBadge status={row.voucherStatus} />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[12px]">
                        <div>{row.discountCode || "—"}</div>
                        {row.discountCode && row.codeUsed != null ? (
                          <div className="mt-1 font-sans">
                            <CodeUsageBadge used={row.codeUsed} />
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2.5">
                        {!row.eligible ? (
                          <span
                            className="text-[12px] text-[#6B6B6B] whitespace-nowrap cursor-help"
                            title={row.ineligibleReason || undefined}
                          >
                            Not eligible
                          </span>
                        ) : row.voucherStatus === "sent" ? (
                          <span className="text-[12px] text-[#6B6B6B]">
                            Sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={actionButtonClass}
                            disabled={isBusy}
                            onClick={() => void sendVoucher(row)}
                          >
                            {isBusy ? "Sending…" : label}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length === 0 ? null : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6b7280]">
              {loading && items.length === 0
                ? "Loading paid orders from Shopify…"
                : rangeStart > 0
                  ? `Showing ${rangeStart}–${rangeEnd} ${
                      viewFilter === "all"
                        ? "paid"
                        : viewFilter === "eligible"
                          ? "eligible"
                          : "not-sent"
                    } orders from Shopify`
                  : "No orders on this page"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void goPrev()}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-[72px] text-center text-[13px] text-[#374151]">
                Page {page}
              </span>
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={!hasMore || loading}
                aria-label="Next page"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default SendVouchersTab;
