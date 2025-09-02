"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";

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

      <div className="mt-5 mb-10 flex flex-wrap justify-center gap-8 px-5 sm:mt-8 md:px-0">
        {products?.map((product) => (
          <Link href={`/${product.handle}`} key={product.id}>
            <ProductCard key={product.id} product={product} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Shop;

// ProductCard Component
const ProductCard = ({ product }: { product: Product }) => {
  console.log(product,"ProductCard");
  
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    name,
    image,
    hoverImage,
    sizes,
    currentPrice,
    comparePrice,
    discountPercentage,
    urduTitle,
    englishTitle,
    formatPrice
  } = useProductData(product);

  return (
    <div className="w-full md:w-[353px]">
      <div 
        className="relative w-full flex justify-center overflow-hidden rounded-[24px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative w-full h-[523px]">
          {/* First Image (Default) */}
          <Image
            src={image}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          />
          
          {/* Hover Image */}
          <Image
            src={hoverImage}
            alt={name}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
        
        <div className="w-fit absolute bottom-7">
          {discountPercentage > 0 && (
            <Text className="text-[14px] font-semibold bg-white rounded-[24px] px-3 py-1">
              Sale {discountPercentage}% Off
            </Text>
          )}
        </div>
        <Sizes product={product} sizes={sizes} />
      </div>

      <Text className="text-right line-through text-[#302A25]/50 text-[13.2px] font-poppins font-semibold mb-[-3px] mt-4">
        was: {formatPrice(comparePrice)}
      </Text>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex flex-col">
          {urduTitle && (
            <Text className="text-primary-foreground text-[19px] font-semibold mb-1">
              {urduTitle}
            </Text>
          )}
          {englishTitle && (
            <Text className="text-[#302A25] text-[16px] font-semibold  mt-2">
              {englishTitle}
            </Text>
          )}
        </div>
        <Text className="text-primary-foreground text-[19px] font-semibold">
          Rs. {formatPrice(currentPrice)}
        </Text>
      </div>

      {/* <Text className="text-caption line-clamp-4">{description}</Text> */}

      {/* Color selection removed */}
    </div>
  );
};
