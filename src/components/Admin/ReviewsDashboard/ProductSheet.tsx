"use client";

import React from "react";
import Image from "next/image";

import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import logo from "@/public/logo.png";
import { ProductFilter } from "./constants";
import ProductNav from "./ProductNav";

type ProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productFilter: ProductFilter;
  totalCount: number;
  productCounts: Map<string, number>;
  onSelect: (id: ProductFilter) => void;
  onLogout: () => void;
};

const ProductSheet: React.FC<ProductSheetProps> = ({
  open,
  onOpenChange,
  productFilter,
  totalCount,
  productCounts,
  onSelect,
  onLogout,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="left"
      className="sheet-slide-left w-[280px] max-w-[85vw] p-0 gap-0 bg-white flex flex-col h-full"
    >
      <SheetHeader className="px-4 py-4 border-b border-black/10 text-left shrink-0">
        <SheetTitle className="sr-only">Products</SheetTitle>
        <SheetDescription className="sr-only">
          Filter reviews by product
        </SheetDescription>
        <Image src={logo} alt="Albaraka Honey" className="w-[105px]" />
      </SheetHeader>
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
      <div className="shrink-0 border-t border-black/10 p-4">
        <Button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onLogout();
          }}
          className="w-full justify-center rounded-md bg-[#302A25] text-white text-[14px] px-4 py-2.5 hover:opacity-90"
        >
          Logout
        </Button>
      </div>
    </SheetContent>
  </Sheet>
);

export default ProductSheet;
