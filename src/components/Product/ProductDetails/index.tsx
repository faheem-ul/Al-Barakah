"use client";

import React, { useMemo, useState, useEffect } from "react";
// import parse from "html-react-parser";

import { Product } from "@/lib/shopify/types";
import { RatingStarIcon } from "@/ui/Icons";
import Text from "@/ui/Text";
import ReviewsSummary from "@/components/Product/ProductReviews/ReviewsSummary";
// import { calculatePercentageOff } from "@/lib/utils";
import { useProductData } from "@/hooks/useProductData";
import { getReviews } from "@/lib/reviews";
import { isPremiumProduct } from "@/lib/admin-products";
import ProductTitle from "@/ui/ProductTitle";
import {
  getComboCategoryForProduct,
  isComboProduct,
} from "@/components/Home/ComboDeals/comboConfig";
import {
  formatComboText,
  MixedScriptText,
} from "@/components/Home/ComboDeals/comboText";

// import ProductAccordion from "./Accordion";
import ProductVariantSelector from "./ProductVariantSelector";
// import { formatPrice } from "@/lib/utils/shopify";
// import { WarningIcon } from "@/ui/Icons";

interface PropTypes {
  product: Product;
  selectedVariantId: string | null;
  onVariantChange: (variantId: string) => void;
}

const ProductDescription = (props: PropTypes) => {
  const { product, selectedVariantId, onVariantChange } = props;
  const productData = useProductData(product);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const isCombo = isComboProduct(product);
  const comboCategory = isCombo
    ? getComboCategoryForProduct(product)
    : undefined;
  const comboProductName = isCombo ? formatComboText(product.title || "") : "";
  const comboDescription =
    isCombo && product.description?.trim()
      ? formatComboText(product.description)
      : "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getReviews(product.id);
        if (mounted) setReviewCount(rows.length || 0);
      } catch {
        if (mounted) setReviewCount(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [product.id]);

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);
  const currentPriceAmount =
    selectedVariant?.price?.amount || product.priceRange.minVariantPrice.amount;
  const comparePriceAmount =
    selectedVariant?.compareAtPrice?.amount ||
    product.compareAtPriceRange.maxVariantPrice.amount;

  return (
    <div>
      {/* 100% Purity Guaranteed and Rating on same line */}
      <div className="flex items-start md:items-center justify-between mb-1 md:mt-16">
        <Text className="text-sm text-black">100% Purity Guaranteed</Text>
        <div className="flex items-center gap-2 md:flex-row flex-col-reverse">
          <div className="flex text-[14px] items-center gap-1">
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <RatingStarIcon
                  key={index}
                  width={20}
                  height={20}
                  color={reviewCount === 0 ? "#D1D5DB" : "#F6C854"}
                  className="flex flex-shrink"
                />
              ))}
          </div>
          <ReviewsSummary productId={product.id} />
        </div>
      </div>
      {/* Combo: config title → product name → multi-line description */}
      {isCombo ? (
        <div className="md:mt-0 mt-7">
          {comboCategory?.title ? (
            <Text className="mb-2 text-[28px] font-bold text-black md:text-[35px]">
              {comboCategory.title}
            </Text>
          ) : null}
          {comboProductName ? (
            <MixedScriptText
              text={comboProductName}
              align="start"
              className="mb-2 overflow-visible pt-5 text-[16px] font-semibold text-black md:text-[20px]"
              urduClassName="px-0.5"
            />
          ) : null}
          {comboDescription ? (
            <MixedScriptText
              text={comboDescription}
              align="start"
              className="mb-1 overflow-visible text-[14px] leading-relaxed text-black/65 md:text-[16px]"
              urduClassName="px-0.5 text-[15px] text-black/70 md:text-[17px]"
              latinClassName="tracking-tight"
            />
          ) : null}
        </div>
      ) : (
        <ProductTitle
          urduTitle={productData.urduTitle}
          englishTitle={productData.englishTitle}
          isInterleavedTitle={productData.isInterleavedTitle}
          titleSegments={productData.titleSegments}
          urduClassName="mb-2 text-[28px] md:text-[35px] font-bold text-black font-arabic md:mt-0 mt-7"
          englishClassName="text-[16px] md:text-[20px] font-semibold text-black"
          mixedClassName="mb-2 text-[28px] md:text-[35px] font-bold text-black md:mt-0 mt-7"
          englishBadge={
            isPremiumProduct(product.id) ? (
              <span className="rounded-full bg-[#F6C854] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black md:text-[12px]">
                Premium
              </span>
            ) : undefined
          }
        />
      )}
      {/* Price */}
      <div className="pt-10">
        <div className="flex items-end gap-3 mb-2">
          <Text className="text-[18px] text-black font-semibold w-[75px]">
            Price:
          </Text>
          <Text className="text-black text-[20px] font-semibold">
            Rs. {productData.formatPrice(currentPriceAmount)}
          </Text>

          {Number(comparePriceAmount) > 0 && (
            <div className="">
              <Text className="text-[15px] text-black/50 font-medium">
                was:{" "}
                <span className="line-through">
                  {productData.formatPrice(comparePriceAmount)}
                </span>
              </Text>
            </div>
          )}
        </div>
      </div>
      {/* Price */}
      {/* Weight */}

      <ProductVariantSelector
        product={product}
        onVariantChange={onVariantChange}
      />
      {/* <div className="mb-4">
        <div className="flex items-center gap-3">
          <Text className="text-[18px] text-black font-semibold w-[75px]">
            Weight:
          </Text>
          <div className="bg-black text-white px-5 py-1 rounded-[20px] text-sm font-medium">
            1 Kg
          </div>
        </div>
      </div> */}
      {/* Weight */}
      {/* <ProductVariantSelector product={product} /> */}
      {/* <div className="md:w-[527px] w-full bg-[#000] gap-2 h-[50px] flex justify-start items-center rounded-[8px] pl-[17px] mt-[42px]">
        <span className="text-[25px] font-semibold text-white">!</span>
        <Text className="text-white text-[12px] md:text-[14px]">
          Note: Free Home Delivery is applied to only Orders above 3000 PKR
        </Text>
      </div> */}
    </div>
  );
};

export default ProductDescription;
