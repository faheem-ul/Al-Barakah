"use client";

import React from "react";
import Image from "next/image";

import Text from "@/components/ui/Text";
import logo from "@/public/logo.png";
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
  <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-black/10 bg-white h-full">
    <div className="px-4 py-5 border-b border-black/10 shrink-0">
      <Image src={logo} alt="Albaraka Honey" className="w-[105px]" />
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
      <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
        Products
      </Text>
      <ProductNav
        productFilter={productFilter}
        totalCount={totalCount}
        productCounts={productCounts}
        onSelect={onSelect}
      />
    </div>
  </aside>
);

export default ProductSidebar;
