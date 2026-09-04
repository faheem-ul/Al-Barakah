"use client";

import { useMemo } from "react";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";

import ComboCategory from "./ComboCategory";
import {
  COMBO_CATEGORIES,
  ComboCategoryId,
} from "./comboConfig";

export interface ComboDealsCategories {
  duo: Product[];
  family: Product[];
  mix: Product[];
  gift: Product[];
}

interface ComboDealsProps {
  categories: ComboDealsCategories;
}

const CATEGORY_PRODUCTS_KEY: Record<
  ComboCategoryId,
  keyof ComboDealsCategories
> = {
  duo: "duo",
  family: "family",
  mix: "mix",
  gift: "gift",
};

const ComboDeals = ({ categories }: ComboDealsProps) => {
  const sections = useMemo(
    () =>
      COMBO_CATEGORIES.map((config) => ({
        config,
        products: categories[CATEGORY_PRODUCTS_KEY[config.id]] ?? [],
      })).filter((section) => section.products.length > 0),
    [categories]
  );

  const hasAnyProducts = sections.length > 0;

  return (
    <section className="mb-10 px-5 pb-4 md:mb-16 md:px-0 md:pb-6">
      <div className="text-center">
        <Text as="h1" className="text-center text-[32px] md:text-[40px]">
          Combo Deals & Bundles
        </Text>
        <Text className="font-arabic text-primary-foreground mt-2 text-[18px] font-bold md:text-[24px]">
          زیادہ بچت — ملا کر خریدیں
        </Text>
        <Text className="mx-auto mt-3 max-w-xl text-[14px] text-black/60 md:text-[15px]">
          <span className="font-bold text-black">
            Every combo ships with Free Delivery
          </span>
        </Text>
      </div>

      {hasAnyProducts ? (
        <div className="mt-10 flex flex-col gap-12 md:mt-12 md:gap-16">
          {sections.map(({ config, products }) => (
            <ComboCategory
              key={config.id}
              config={config}
              products={products}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 py-8 text-center">
          <Text className="text-black/50">
            Combo deals coming soon — check back shortly.
          </Text>
        </div>
      )}
    </section>
  );
};

export default ComboDeals;
