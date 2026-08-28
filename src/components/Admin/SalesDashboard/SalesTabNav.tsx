"use client";

import React from "react";
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SalesTab } from "@/lib/sales/types";

import { AdminSidebarButton } from "@/components/Admin/AdminSidebarItem";
import { SALES_TABS } from "./constants";

const TAB_ICONS: Record<SalesTab, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  reports: BarChart3,
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
}) => (
  <nav className="flex flex-col gap-1">
    {SALES_TABS.map((item) => (
      <AdminSidebarButton
        key={item.id}
        label={item.label}
        icon={TAB_ICONS[item.id]}
        active={tab === item.id}
        onClick={() => {
          onSelect(item.id);
          onNavigate?.();
        }}
      />
    ))}
  </nav>
);

export default SalesTabNav;
