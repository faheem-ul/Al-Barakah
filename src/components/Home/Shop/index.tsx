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
  title?: string;
  productNameMaxWidth?: number;
  /** When true, link with Shopify handle (e.g. /deal1). Default uses title slug like Shop. */
  useShopifyHandle?: boolean;
  imageObjectFit?: "cover" | "fill";
}

const Shop = (props: PropTypes) => {
  const {
    products,
    title = "Shop",
    productNameMaxWidth,
    useShopifyHandle = false,
    imageObjectFit = "cover",
  } = props;

  return (
    <div>
      <Text as="h1" className="text-center text-[40px]">
        {title}
      </Text>

      <div className="mt-5 mb-10 grid grid-cols-2 justify-items-center gap-3 px-5 sm:mt-[53px] md:flex md:justify-center md:px-0">
        <div className="contents md:flex md:w-full md:max-w-[calc(353px*3+2*2rem)] md:flex-wrap md:justify-start md:gap-8">
          {products?.map((product) => {
            const href = useShopifyHandle
              ? `/${product.handle}`
              : `/${toEnglishSlugFromTitle(product.title) || product.handle}`;

            return (
              <Link
                href={href}
                key={product.id}
                className="w-full max-w-[353px] md:w-[353px]"
              >
                <ProductCard
                  key={product.id}
                  product={product}
                  productNameMaxWidth={productNameMaxWidth}
                  imageObjectFit={imageObjectFit}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Shop;

// ProductCard Component
const ProductCard = ({
  product,
  productNameMaxWidth,
  imageObjectFit = "cover",
}: {
  product: Product;
  productNameMaxWidth?: number;
  imageObjectFit?: "cover" | "fill";
}) => {
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
    isInterleavedTitle,
    titleSegments,
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

  const objectFitClass =
    imageObjectFit === "fill" ? "object-fill" : "object-cover";

  return (
    <div className="w-full relative">
      <div className="w-fit absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-1/2 md:hidden">
        {cardDiscountPercentage > 0 && (
          <Text className="md:text-[14px] text-[12px] font-semibold bg-white border border-[#e7e7e7] rounded-[20px] px-3 py-1 text-center whitespace-nowrap">
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
            className={`${objectFitClass} transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Hover Image */}
          <Image
            src={hoverImage}
            alt={name}
            fill
            className={`${objectFitClass} transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        <div className="absolute bottom-7 left-1/2 hidden w-fit -translate-x-1/2 md:block">
          {cardDiscountPercentage > 0 && (
            <Text className="md:text-[14px] text-[12px] font-semibold bg-white rounded-[20px] px-4 py-2 text-center whitespace-nowrap">
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
          <div
            style={
              productNameMaxWidth
                ? { maxWidth: productNameMaxWidth }
                : undefined
            }
          >
            <ProductTitle
              urduTitle={urduTitle}
              englishTitle={englishTitle}
              isInterleavedTitle={isInterleavedTitle}
              titleSegments={titleSegments}
              urduClassName="text-primary-foreground font-arabic text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
              englishClassName="text-black text-[12px] md:text-[16px] capitalize font-semibold md:text-left md:mt-2"
              mixedClassName="text-primary-foreground text-[14px] md:text-[19px] font-bold mb-1 md:text-left"
            />
          </div>

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
