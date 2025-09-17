"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import { toEnglishSlugFromTitle } from "@/lib/utils";

import Sizes from "./Sizes";

interface PropTypes {
  products: Product[];
}

const Shop = (props: PropTypes) => {
  const { products } = props;

  return (
    <div>
      <Text as="h1" className="text-center text-[40px]">
        Shop
      </Text>

      <div className="mt-5 mb-10 grid grid-cols-2 justify-start gap-3 md:flex md:justify-center md:gap-8 px-5 sm:mt-[53px] md:px-0">
        {products?.map((product) => {
          return (
            <Link
              href={`/${
                toEnglishSlugFromTitle(product.title) || product.handle
              }`}
              key={product.id}
              className={"w-full md:w-auto"}
            >
              <ProductCard key={product.id} product={product} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;

// ProductCard Component
const ProductCard = ({ product }: { product: Product }) => {
  console.log(product, "ProductCard");

  const [isHovered, setIsHovered] = useState(false);

  const {
    name,
    image,
    hoverImage,
    sizes,
    currentPrice,
    comparePrice,
    // discountPercentage,
    urduTitle,
    englishTitle,
    formatPrice,
  } = useProductData(product);

  // Prefer showing 1/2kg variant price on cards when available
  const weightOptionName = "weight";
  const halfKgVariant = product.variants.find((v) =>
    v.selectedOptions.some(
      (o) =>
        o.name.toLowerCase() === weightOptionName &&
        /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " "))
    )
  );
  const cardPriceAmount = halfKgVariant?.price?.amount || currentPrice;
  const cardCompareAmount =
    halfKgVariant?.compareAtPrice?.amount || comparePrice;
  const halfKgLabel = halfKgVariant?.selectedOptions.find(
    (o) => o.name.toLowerCase() === weightOptionName
  )?.value;

  // Calculate discount percentage based on the selected variant prices
  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);

    if (compare <= 0 || current >= compare) {
      return 0; // No discount or invalid prices
    }

    const discount = ((compare - current) / compare) * 100;
    return Math.round(discount); // Round to nearest whole number
  };

  const cardDiscountPercentage = calculateDiscountPercentage(
    cardPriceAmount,
    cardCompareAmount
  );

  return (
    <div className="md:w-[353px] w-[186px] relative">
      <div className="w-fit relative bottom-[-4px] left-[17%] z-50 md:hidden block">
        {cardDiscountPercentage > 0 && (
          <Text className="md:text-[14px] text-[12px] font-semibold bg-white border border-[#e7e7e7] rounded-[20px] px-3 py-1">
            Discount {cardDiscountPercentage}% Off
          </Text>
        )}
      </div>
      <div
        className="relative w-full flex justify-center overflow-hidden rounded-[24px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative w-full h-[195px] md:h-[523px]">
          {/* First Image (Default) */}
          <Image
            src={image}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Hover Image */}
          <Image
            src={hoverImage}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        <div className="w-fit absolute bottom-7 md:block hidden">
          {cardDiscountPercentage > 0 && (
            <Text className="md:text-[14px] text-[12px] font-semibold bg-white rounded-[20px] px-4 py-2">
              Discount {cardDiscountPercentage}% Off
            </Text>
          )}
        </div>
        <Sizes product={product} sizes={sizes} />
      </div>

      <div className="hidden items-center justify-between md:block mt-3 md:mt-0 mb-3 md:mb-0">
        {Number(cardCompareAmount) > 0 && (
          <Text className="text-right line-through text-black/50 text-[13.2px] font-poppins font-semibold md:mb-[-3px] md:mt-4">
            was: {formatPrice(cardCompareAmount)}
          </Text>
        )}

        {halfKgVariant && (
          <Text className="text-[12px] text-black/60 font-semibold text-right md:hidden block">
            ({halfKgLabel})
          </Text>
        )}
      </div>
      <div className="mb-2 flex items-start justify-between md:flex-row flex-col">
        <div className="flex flex-col mt-3 md:mt-0">
          {urduTitle && (
            <Text className="text-primary-foreground font-arabic text-[14px] md:text-[19px] font-bold mb-1 md:text-left">
              {urduTitle}
            </Text>
          )}
          {englishTitle && (
            <Text className="text-black text-[12px] md:text-[16px] capitalize font-semibold md:text-left md:mt-2">
              {englishTitle}
            </Text>
          )}

          {Number(cardCompareAmount) > 0 && (
            <Text className="text-left md:hidden line-through text-black/50 text-[12px] font-poppins font-semibold md:mb-[-3px] md:mt-4">
              was: {formatPrice(cardCompareAmount)}
            </Text>
          )}
        </div>
        <div className="flex md:block items-center gap-2 mt-1 md:mt-0 justify-between">
          <Text className="text-primary-foreground text-[19px] font-semibold md:text-right text-center">
            Rs. {formatPrice(cardPriceAmount)}
          </Text>

          {halfKgVariant && (
            <Text className="text-[12px] text-black/60 text-right md:block">
              ({halfKgLabel})
            </Text>
          )}
        </div>
      </div>

      {/* <Text className="text-caption line-clamp-4">{description}</Text> */}

      {/* Color selection removed */}
    </div>
  );
};
