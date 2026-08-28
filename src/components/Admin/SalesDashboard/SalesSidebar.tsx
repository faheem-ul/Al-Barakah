"use client";

import React from "react";

import Text from "@/components/ui/Text";
import AdminNav from "@/components/Admin/AdminNav";
import AdminSidebarShell from "@/components/Admin/AdminSidebarShell";
import type { SalesTab } from "@/lib/sales/types";

import SalesTabNav from "./SalesTabNav";

type SalesSidebarProps = {
  tab: SalesTab;
  onTabChange: (tab: SalesTab) => void;
};

const SalesSidebar: React.FC<SalesSidebarProps> = ({ tab, onTabChange }) => (
  <AdminSidebarShell>
    <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
      Admin
    </Text>
    <AdminNav variant="sidebar" className="mb-5" />

    <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
      Sales Dashboard
    </Text>
    <SalesTabNav tab={tab} onSelect={onTabChange} />
  </AdminSidebarShell>
);

export default SalesSidebar;
