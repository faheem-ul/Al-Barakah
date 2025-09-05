"use client";

import React, { useMemo, useState } from "react";
// import parse from "html-react-parser";

import { Product } from "@/lib/shopify/types";
import { RatingStarIcon } from "@/ui/Icons";
import Text from "@/ui/Text";
import ReviewsSummary from "@/components/Product/ProductReviews/ReviewsSummary";
// import { calculatePercentageOff } from "@/lib/utils";
import { useProductData } from "@/hooks/useProductData";

// import ProductAccordion from "./Accordion";
import ProductVariantSelector from "./ProductVariantSelector";
// import { formatPrice } from "@/lib/utils/shopify";
// import { WarningIcon } from "@/ui/Icons";

interface PropTypes {
  product: Product;
}

const ProductDescription = (props: PropTypes) => {
  const { product } = props;
  const productData = useProductData(product);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);
  const currentPriceAmount =
    selectedVariant?.price?.amount || product.priceRange.minVariantPrice.amount;
  const comparePriceAmount =
    selectedVariant?.compareAtPrice?.amount ||
    product.compareAtPriceRange.maxVariantPrice.amount;

  // const percentageOff = calculatePercentageOff(
  //   product?.priceRange?.minVariantPrice?.amount,
  //   product?.compareAtPriceRange?.maxVariantPrice?.amount,
  // );

  return (
    <div>
      {/* 100% Purity Guaranteed and Rating on same line */}
      <div className="flex items-center justify-between mb-1 md:mt-16">
        <Text className="text-sm text-black">100% Purity Guaranteed</Text>
        <div className="flex items-center gap-2 md:flex-row felx-col">
          <div className="flex text-[14px] items-center gap-1">
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <RatingStarIcon
                  key={index}
                  width={20}
                  height={20}
                  className="flex flex-shrink"
                />
              ))}
          </div>
          <ReviewsSummary productId={product.id} />
        </div>
      </div>
      {/* Urdu Title */}
      {productData.urduTitle && (
        <Text className="mb-2 text-[28px] md:text-[35px] font-bold text-black font-arabic md:mt-0 mt-7">
          {productData.urduTitle}
        </Text>
      )}
      {/* English Title */}
      {productData.englishTitle && (
        <Text className="mb-2 text-[16px] md:text-[20px] font-semibold text-black">
          {productData.englishTitle}
        </Text>
      )}
      {/* Price */}
      <div className="mb-4 pt-4">
        <div className="flex items-end gap-3 mb-2">
          <Text className="text-[18px] text-black font-semibold w-[75px]">
            Price:
          </Text>
          {Number(comparePriceAmount) > 0 && (
            <div className="">
              <Text className="text-[15px] text-black/50 font-medium">
                was:{" "}
                <span className="line-through">
                  {productData.formatPrice(comparePriceAmount)}
                </span>
              </Text>
              <Text className="text-black text-[20px] font-semibold">
                Rs. {productData.formatPrice(currentPriceAmount)}
              </Text>
            </div>
          )}
        </div>
      </div>
      {/* Price */}
      {/* Weight */}

      <ProductVariantSelector
        product={product}
        onVariantChange={setSelectedVariantId}
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
      <div className="md:w-[527px] w-full bg-[#000] gap-2 h-[50px] flex justify-start items-center rounded-[8px] pl-[17px] mt-[42px]">
        {/* <WarningIcon /> */}
        <span className="text-[25px] font-semibold text-white">!</span>
        <Text className="text-white text-[12px] md:text-[14px]">
          Note: Free Home Delivery is applied to only Orders above 3000 PKR
        </Text>
      </div>
    </div>
  );
};

export default ProductDescription;
