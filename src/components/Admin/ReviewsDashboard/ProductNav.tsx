"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
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
    <button
      type="button"
      onClick={() => onSelect("all")}
      className={cn(
        "w-full text-left px-3 py-2.5 text-[13px] font-medium rounded-md transition-colors cursor-pointer",
        productFilter === "all"
          ? "bg-black text-white"
          : "text-black hover:bg-black/5",
      )}
    >
      All ({totalCount})
    </button>
    {ADMIN_PRODUCTS.map((p) => (
      <button
        key={p.id}
        type="button"
        onClick={() => onSelect(p.id)}
        className={cn(
          "w-full text-left px-3 py-2.5 text-[13px] font-medium rounded-md transition-colors cursor-pointer",
          productFilter === p.id
            ? "bg-black text-white"
            : "text-black hover:bg-black/5",
        )}
      >
        <span className="line-clamp-3">{p.label}</span>
        <span className="opacity-70"> ({productCounts.get(p.id) || 0})</span>
      </button>
    ))}
  </nav>
);

export default ProductNav;
