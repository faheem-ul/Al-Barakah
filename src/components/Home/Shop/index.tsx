"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import { toEnglishSlugFromTitle } from "@/lib/utils";
import ProductTitle from "@/ui/ProductTitle";

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

      <div className="mt-5 mb-10 grid grid-cols-2 justify-items-center gap-3 px-5 sm:mt-[53px] md:flex md:flex-wrap md:justify-center md:gap-8 md:px-0">
        {products?.map((product) => {
          return (
            <Link
              href={`/${
                toEnglishSlugFromTitle(product.title) || product.handle
              }`}
              key={product.id}
              className="w-full max-w-[353px] md:w-[353px]"
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

const ProductCard = ({ product }: { product: Product }) => {
  const [isHovered, setIsHovered] = useState(false);

  const {
    name,
    image,
    hoverImage,
    sizes,
    currentPrice,
    comparePrice,
    urduTitle,
    englishTitle,
    isInterleavedTitle,
    titleSegments,
    formatPrice,
  } = useProductData(product);

  const weightOptionName = "weight";
  const halfKgVariant = product.variants.find((v) =>
    v.selectedOptions.some(
      (o) =>
        o.name.toLowerCase() === weightOptionName &&
        /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " "))
    )
  );
  const cardPriceAmount = halfKgVariant?.price?.amount || currentPrice;
  const halfKgLabel = halfKgVariant?.selectedOptions.find(
    (o) => o.name.toLowerCase() === weightOptionName
  )?.value;

  const cardCompareAmount =
    halfKgVariant?.compareAtPrice?.amount || comparePrice;
  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);
    if (compare <= 0 || current >= compare) return 0;
    return Math.round(((compare - current) / compare) * 100);
  };
  const cardDiscountPercentage = calculateDiscountPercentage(
    cardPriceAmount,
    cardCompareAmount
  );

  return (
    <div className="relative w-full">
      {cardDiscountPercentage > 0 && (
        <div className="relative bottom-[-4px] left-[17%] z-50 w-fit md:hidden">
          <Text className="rounded-[20px] border border-[#e7e7e7] bg-white px-3 py-1 text-[12px] font-semibold md:text-[14px]">
            Discount {cardDiscountPercentage}% Off
          </Text>
        </div>
      )}
      <div
        className="relative flex w-full justify-center overflow-hidden rounded-[24px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative h-[195px] w-full md:h-[523px]">
          <Image
            src={image}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-0" : "opacity-100"
            }`}
          />
          <Image
            src={hoverImage}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {cardDiscountPercentage > 0 && (
          <div className="absolute bottom-7 hidden w-fit md:block">
            <Text className="rounded-[20px] bg-white px-4 py-2 text-[12px] font-semibold md:text-[14px]">
              Discount {cardDiscountPercentage}% Off
            </Text>
          </div>
        )}
        <Sizes product={product} sizes={sizes} />
      </div>

      <div className="mt-3 mb-3 hidden min-h-0 items-center justify-between md:mt-4 md:mb-0 md:block">
        {Number(cardCompareAmount) > 0 && (
          <Text className="font-poppins text-right text-[13.2px] font-semibold text-black/50 line-through md:mt-4 md:mb-[-3px]">
            was: {formatPrice(cardCompareAmount)}
          </Text>
        )}
        {halfKgVariant && (
          <Text className="block text-right text-[12px] font-semibold text-black/60 md:hidden">
            ({halfKgLabel})
          </Text>
        )}
      </div>
      <div className="mt-3 mb-2 flex flex-col items-start justify-between md:mt-0 md:flex-row">
        <div className="flex flex-col md:mt-0">
          <ProductTitle
            urduTitle={urduTitle}
            englishTitle={englishTitle}
            isInterleavedTitle={isInterleavedTitle}
            titleSegments={titleSegments}
            urduClassName="text-primary-foreground font-arabic text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
            englishClassName="text-black text-[12px] md:text-[16px] capitalize font-semibold md:text-left md:mt-2"
            mixedClassName="text-primary-foreground text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
          />

          {Number(cardCompareAmount) > 0 && (
            <Text className="font-poppins text-left text-[12px] font-semibold text-black/50 line-through md:mt-4 md:mb-[-3px] md:hidden">
              was: {formatPrice(cardCompareAmount)}
            </Text>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 md:mt-0 md:block">
          <Text className="text-primary-foreground text-center text-[19px] font-semibold md:text-right">
            Rs. {formatPrice(cardPriceAmount)}
          </Text>

          {halfKgVariant && (
            <Text className="text-right text-[12px] text-black/60 md:block">
              ({halfKgLabel})
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};
