"use client";

import React from "react";
import { LayoutGrid, Package } from "lucide-react";

import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import { AdminSidebarButton } from "@/components/Admin/AdminSidebarItem";
import { ProductFilter } from "./constants";

type ProductNavProps = {
  productFilter: ProductFilter;
  totalCount: number;
  productCounts: Map<string, number>;
  onSelect: (id: ProductFilter) => void;
};

const ProductNav: React.FC<ProductNavProps> = ({
  productFilter,
  totalCount,
  productCounts,
  onSelect,
}) => (
  <nav className="flex flex-col gap-1">
    <AdminSidebarButton
      label={`All (${totalCount})`}
      icon={LayoutGrid}
      active={productFilter === "all"}
      onClick={() => onSelect("all")}
    />
    {ADMIN_PRODUCTS.map((p) => (
      <AdminSidebarButton
        key={p.id}
        label={
          <>
            <span className="line-clamp-3">{p.label}</span>
            <span className="opacity-70"> ({productCounts.get(p.id) || 0})</span>
          </>
        }
        icon={Package}
        active={productFilter === p.id}
        onClick={() => onSelect(p.id)}
      />
    ))}
  </nav>
);

export default ProductNav;
