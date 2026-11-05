"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import AdminNav from "@/components/Admin/AdminNav";
import AdminSidebarShell from "@/components/Admin/AdminSidebarShell";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/Text";
import { BurgerMenuIcon } from "@/ui/Icons";
import logo from "@/public/logo.png";

import { type VoucherEmailFilterTab } from "./constants";
import VoucherEmailFilterSheet from "./VoucherEmailFilterSheet";
import VoucherEmailFilters from "./VoucherEmailFilters";
import VoucherEmailStatusBadge from "./VoucherEmailStatusBadge";

type VoucherEmailRow = {
  id: string;
  status: "pending" | "sent" | "failed";
  email: string;
  orderNumber: string;
  discountCode?: string;
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

const LoyaltyVouchersDashboard: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [items, setItems] = useState<VoucherEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VoucherEmailFilterTab>("all");
  const [navOpen, setNavOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
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
  }, [user]);

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

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#F7F7F7] overflow-hidden">
      <AdminSidebarShell>
        <AdminNav variant="sidebar" />
      </AdminSidebarShell>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="md:hidden bg-white border-b border-black/10 shrink-0">
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <Image src={logo} alt="Albaraka Honey" className="w-[90px] shrink-0" />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setNavOpen(true)}
              className="shrink-0 p-1"
            >
              <BurgerMenuIcon />
            </button>
          </div>
        </header>

        <header className="hidden md:block bg-white border-b border-black/10 shrink-0">
          <div className="w-full px-8 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Text className="text-[20px] font-semibold text-black">
                Voucher emails
              </Text>
              <Text className="text-[13px] text-[#6B6B6B] truncate">
                {user?.email || "Admin"}
              </Text>
            </div>
            <Button type="button" variant="secondary" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-light p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
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
                onClick={() => load()}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="md:hidden w-full mb-4"
              onClick={() => load()}
              disabled={loading}
            >
              Refresh
            </Button>

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
                Customer voucher emails from paid Shopify orders. Failed rows
                keep the discount code when one was already created.
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
                          <td
                            className="py-2.5 text-[#b42318] max-w-[280px]"
                            title={row.emailError || undefined}
                          >
                            {row.emailError
                              ? truncate(row.emailError)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {navOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/40"
          onClick={() => setNavOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setNavOpen(false)}
          role="presentation"
        >
          <div
            className="absolute right-0 top-0 h-full w-[min(100%,280px)] bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Admin navigation"
          >
            <AdminNav variant="sidebar" onNavigate={() => setNavOpen(false)} />
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => logout()}
            >
              Log out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LoyaltyVouchersDashboard;
