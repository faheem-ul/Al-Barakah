"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import AdminNav from "@/components/Admin/AdminNav";
import AdminSidebarShell from "@/components/Admin/AdminSidebarShell";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { BurgerMenuIcon } from "@/ui/Icons";
import logo from "@/public/logo.png";

import SendVouchersTab from "./SendVouchersTab";
import VoucherEmailHistoryTab from "./VoucherEmailHistoryTab";

type LoyaltyPageTab = "history" | "send";

const PAGE_TABS: { id: LoyaltyPageTab; label: string }[] = [
  { id: "send", label: "Send vouchers" },
  { id: "history", label: "Email history" },
];

const LoyaltyVouchersDashboard: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [pageTab, setPageTab] = useState<LoyaltyPageTab>("send");
  const [navOpen, setNavOpen] = useState(false);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

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
            <div className="flex flex-wrap gap-2 mb-6 border-b border-black/10 pb-4">
              {PAGE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPageTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-[14px] font-medium rounded-md border transition-colors cursor-pointer",
                    pageTab === tab.id
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black/15 hover:border-black/40",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {pageTab === "history" ? (
              <VoucherEmailHistoryTab getToken={getToken} />
            ) : (
              <SendVouchersTab getToken={getToken} />
            )}
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
