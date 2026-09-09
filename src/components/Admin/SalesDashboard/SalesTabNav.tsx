"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SalesTab } from "@/lib/sales/types";
import { cn } from "@/lib/utils";

import { AdminSidebarButton } from "@/components/Admin/AdminSidebarItem";
import { isPaymentSubTab, PAYMENTS_SUB_TABS, SALES_TABS } from "./constants";

const TAB_ICONS: Record<
  (typeof SALES_TABS)[number]["id"] | "payments-mp" | "payments-wholesaler",
  LucideIcon
> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  reports: BarChart3,
  stock: Package,
  "payments-mp": Wallet,
  "payments-wholesaler": Wallet,
  settings: Settings,
};

type SalesTabNavProps = {
  tab: SalesTab;
  onSelect: (tab: SalesTab) => void;
  onNavigate?: () => void;
};

const SalesTabNav: React.FC<SalesTabNavProps> = ({
  tab,
  onSelect,
  onNavigate,
}) => {
  const paymentsActive = isPaymentSubTab(tab);
  const [paymentsOpen, setPaymentsOpen] = useState(paymentsActive);

  useEffect(() => {
    if (paymentsActive) setPaymentsOpen(true);
  }, [paymentsActive]);

  const handleSelect = (nextTab: SalesTab) => {
    onSelect(nextTab);
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-1">
      {SALES_TABS.map((item) => {
        if (item.id === "stock") {
          return (
            <React.Fragment key={item.id}>
              <AdminSidebarButton
                label={item.label}
                icon={TAB_ICONS[item.id]}
                active={tab === item.id}
                onClick={() => handleSelect(item.id)}
              />

              <div>
                <button
                  type="button"
                  onClick={() => setPaymentsOpen((open) => !open)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer",
                    paymentsActive
                      ? "bg-black text-white"
                      : "text-black hover:bg-black/5",
                  )}
                >
                  <Wallet className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 text-left">Payments</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      paymentsOpen && "rotate-180",
                    )}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </button>

                {paymentsOpen && (
                  <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-[#e5e7eb] pl-2">
                    {PAYMENTS_SUB_TABS.map((subTab) => (
                      <button
                        key={subTab.id}
                        type="button"
                        onClick={() => handleSelect(subTab.id)}
                        className={cn(
                          "rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors cursor-pointer",
                          tab === subTab.id
                            ? "bg-black text-white"
                            : "text-[#374151] hover:bg-black/5",
                        )}
                      >
                        {subTab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        }

        return (
          <AdminSidebarButton
            key={item.id}
            label={item.label}
            icon={TAB_ICONS[item.id]}
            active={tab === item.id}
            onClick={() => handleSelect(item.id)}
          />
        );
      })}
    </nav>
  );
};

export default SalesTabNav;
