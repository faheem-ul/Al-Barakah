"use client";

import React from "react";

import Text from "@/components/ui/Text";
import AdminNav from "@/components/Admin/AdminNav";
import AdminSidebarShell from "@/components/Admin/AdminSidebarShell";
import { ProductFilter } from "./constants";
import ProductNav from "./ProductNav";

type ProductSidebarProps = {
  productFilter: ProductFilter;
  totalCount: number;
  productCounts: Map<string, number>;
  onSelect: (id: ProductFilter) => void;
};

const ProductSidebar: React.FC<ProductSidebarProps> = ({
  productFilter,
  totalCount,
  productCounts,
  onSelect,
}) => (
  <AdminSidebarShell>
    <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
      Admin
    </Text>
    <AdminNav variant="sidebar" className="mb-5" />

    <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
      Products
    </Text>
    <ProductNav
      productFilter={productFilter}
      totalCount={totalCount}
      productCounts={productCounts}
      onSelect={onSelect}
    />
  </AdminSidebarShell>
);

export default ProductSidebar;
