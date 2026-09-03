"use client";

import { useMemo, useState } from "react";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";

import ComboCategory from "./ComboCategory";
import ComboTabs from "./ComboTabs";
import {
  COMBO_CATEGORIES,
  ComboCategoryId,
  PROMO_ITEMS,
  TRUST_ITEMS,
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
  const availableCategoryIds = useMemo(
    () =>
      COMBO_CATEGORIES.filter(
        (config) => categories[CATEGORY_PRODUCTS_KEY[config.id]]?.length > 0
      ).map((config) => config.id),
    [categories]
  );

  const defaultCategory =
    availableCategoryIds[0] ?? COMBO_CATEGORIES[0].id;

  const [activeCategory, setActiveCategory] =
    useState<ComboCategoryId>(defaultCategory);

  const activeConfig =
    COMBO_CATEGORIES.find((config) => config.id === activeCategory) ??
    COMBO_CATEGORIES[0];

  const activeProducts =
    categories[CATEGORY_PRODUCTS_KEY[activeCategory]] ?? [];

  const hasAnyProducts = availableCategoryIds.length > 0;

  return (
    <section className="my-10  px-5 pt-12 md:my-16 md:px-0 pb-4 md:pb-6 md:pt-16">
      <div className="text-center">
        <Text as="h1" className="text-center text-[32px] md:text-[40px]">
          Combo Deals & Bundles
        </Text>
        <Text className="font-arabic text-primary-foreground mt-2 text-[18px] font-bold md:text-[24px]">
          زیادہ بچت — ملا کر خریدیں
        </Text>
        <Text className="mx-auto mt-3 max-w-xl text-[14px] text-black/60 md:text-[15px]">
          Save more when you buy together — every combo ships with free
          delivery.
        </Text>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2 md:mt-6">
        {PROMO_ITEMS.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e7e7] bg-white px-3 py-1.5 text-[12px] font-medium text-black md:text-[13px]"
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>

      {hasAnyProducts ? (
        <>
          <div className="mt-8">
            <ComboTabs
              categories={COMBO_CATEGORIES}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              availableCategoryIds={availableCategoryIds}
            />
          </div>

          <ComboCategory config={activeConfig} products={activeProducts} />
        </>
      ) : (
        <div className="mt-10 py-8 text-center">
          <Text className="text-black/50">
            Combo deals coming soon — check back shortly.
          </Text>
        </div>
      )}

      <div className="mt-12 flex flex-wrap justify-center gap-4 border-t border-[#e7e7e7] pt-8 md:mt-14 md:gap-7">
        {TRUST_ITEMS.map((item) => (
          <Text
            key={item}
            className="flex items-center gap-2 text-[13px] font-semibold text-black md:text-[14px]"
          >
            <span className="font-bold text-[#2E7D32]">✓</span>
            {item}
          </Text>
        ))}
      </div>
    </section>
  );
};

export default ComboDeals;
