"use client";

import { cn } from "@/lib/utils";

import { ComboCategoryConfig, ComboCategoryId } from "./comboConfig";

interface ComboTabsProps {
  categories: ComboCategoryConfig[];
  activeCategory: ComboCategoryId;
  onCategoryChange: (id: ComboCategoryId) => void;
  availableCategoryIds: ComboCategoryId[];
}

const ComboTabs = ({
  categories,
  activeCategory,
  onCategoryChange,
  availableCategoryIds,
}: ComboTabsProps) => {
  const visibleCategories = categories.filter(
    (category) =>
      availableCategoryIds.includes(category.id) ||
      availableCategoryIds.length === 0
  );

  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
      {visibleCategories.map((category) => {
        const isActive = category.id === activeCategory;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex min-h-[52px] min-w-[132px] cursor-pointer flex-col items-center justify-center rounded-full border-[1.5px] px-5 py-2.5 text-center transition-colors sm:min-w-[148px] md:min-h-[56px] md:px-6",
              isActive
                ? "border-[#C6870F] bg-[#C6870F] text-white"
                : "border-[#EDE4D3] bg-transparent text-[#6B5D4D] hover:border-[#C6870F]"
            )}
          >
            <span className="text-[13px] leading-tight font-semibold md:text-[14px]">
              {category.tabLabel}
            </span>
            <small
              className={cn(
                "mt-0.5 text-[11px] leading-tight font-medium",
                isActive ? "text-white/90" : "text-[#6B5D4D]/70"
              )}
            >
              {category.tabHint}
            </small>
          </button>
        );
      })}
    </div>
  );
};

export default ComboTabs;
