"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import ProductTitle from "@/ui/ProductTitle";
import Sizes from "@/components/Home/Shop/Sizes";

interface PropTypes {
  products: Product[];
}

// Azadi Sale Shop
const AzadiSaleShop = ({ products }: PropTypes) => {
  return (
    <div>
      {/* Azadi Sale title */}
      <Text as="h1" className="text-center text-[40px]">
        Azadi Sale
      </Text>

      {/* Azadi Sale products */}
      <div className="mt-5 mb-10 grid grid-cols-2 justify-items-center gap-3 px-5 sm:mt-[53px] md:flex md:justify-center md:px-0">
        <div className="contents md:flex md:w-full md:max-w-[calc(353px*3+2*2rem)] md:flex-wrap md:justify-start md:gap-8">
          {products?.map((product, index) => (
            <Link
              href={`/${product.handle}`}
              key={product.id}
              className="w-full max-w-[353px] md:w-[353px]"
            >
              {/* Azadi Sale product card */}
              <AzadiSaleProductCard
                product={product}
                dealNumber={index + 1}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Azadi Sale product card
const AzadiSaleProductCard = ({
  product,
  dealNumber,
}: {
  product: Product;
  dealNumber: number;
}) => {
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

  // half kg variant for the card (product card)
  const halfKgVariant = product.variants.find((v) =>
    v.selectedOptions.some(
      (o) =>
        o.name.toLowerCase() === weightOptionName &&
        /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " "))
    )
  );

  // price amount for the card (product card)
  const cardPriceAmount = halfKgVariant?.price?.amount || currentPrice;

  // compare price for the card (product card)
  const cardCompareAmount =
    halfKgVariant?.compareAtPrice?.amount || comparePrice;

  // half kg label for the card (product card)
  const halfKgLabel = halfKgVariant?.selectedOptions.find(
    (o) => o.name.toLowerCase() === weightOptionName
  )?.value;

  // calculate discount percentage for the card (product card)
  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);

    if (compare <= 0 || current >= compare) {
      return 0;
    }

    const discount = ((compare - current) / compare) * 100;
    return Math.round(discount * 10) / 10;
  };

  // calculate discount percentage for the card (product card)
  const cardDiscountPercentage = calculateDiscountPercentage(
    cardPriceAmount,
    cardCompareAmount
  );

  return (
    <div className="relative w-full">
      <div className="absolute top-0 left-1/2 z-50 w-fit -translate-x-1/2 -translate-y-1/2 md:hidden">
        {/* discount percentage for the card (product card) */}
        {cardDiscountPercentage > 0 && (
          <Text className="rounded-[20px] border border-[#e7e7e7] bg-white px-3 py-1 text-center text-[12px] font-semibold whitespace-nowrap md:text-[14px]">
            Discount {cardDiscountPercentage}% Off
          </Text>
        )}
      </div>

      {/* product image */}
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
            className={`object-fill transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-0" : "opacity-100"
            }`}
          />
          <Image
            src={hoverImage}
            alt={name}
            fill
            className={`object-fill transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* discount percentage badge */}
        <div className="absolute bottom-7 left-1/2 hidden w-fit -translate-x-1/2 md:block">
          {cardDiscountPercentage > 0 && (
            <Text className="rounded-[20px] bg-white px-4 py-2 text-center text-[12px] font-semibold whitespace-nowrap md:text-[14px]">
              Discount {cardDiscountPercentage}% Off
            </Text>
          )}
        </div>
        <Sizes product={product} sizes={sizes} />
      </div>

      <div className="mb-2 flex flex-col items-start justify-between md:mt-4 md:flex-row md:items-center">
        <div className="mt-3 max-w-[260px] md:mt-0">
          {/* deal number and twin pack text */}
          <Text className="font-poppins mb-1 text-left text-[12px] font-semibold text-black/50 md:text-[13.2px]">
            Deal {dealNumber}: Twin Pack
          </Text>
          {/* product title */}
          <ProductTitle
            urduTitle={urduTitle}
            englishTitle={englishTitle}
            isInterleavedTitle={isInterleavedTitle}
            titleSegments={titleSegments}
            urduClassName="text-primary-foreground font-arabic text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
            englishClassName="text-black text-[12px] md:text-[16px] capitalize font-semibold md:text-left md:mt-2"
            mixedClassName="text-primary-foreground text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
            weightClassName="text-[14px]"
          />
          {/* was price text */}
          {Number(cardCompareAmount) > 0 && (
            <Text className="font-poppins text-left text-[12px] font-semibold text-black/50 line-through md:hidden md:mt-4 md:mb-[-3px]">
                was: {formatPrice(cardCompareAmount)}
              </Text>
            )}
          </div>

          {/* price amount and half kg label */}
        <div className="mt-1 flex shrink-0 flex-col items-end justify-between gap-0 md:mt-0">
          {Number(cardCompareAmount) > 0 && (
            <Text className="hidden font-poppins text-right text-[13.2px] font-semibold text-black/50 line-through md:block">
              was: {formatPrice(cardCompareAmount)}
            </Text>
          )}
          <Text className="text-primary-foreground text-center text-[19px] font-semibold md:text-right">
            Rs. {formatPrice(cardPriceAmount)}
          </Text>
          {halfKgVariant && (
            <Text className="hidden text-right text-[12px] text-black/60 md:block">
              ({halfKgLabel})
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default AzadiSaleShop;
