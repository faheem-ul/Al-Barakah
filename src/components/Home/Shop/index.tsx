import React from "react";
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

      <div className="mt-5 flex flex-wrap justify-center gap-8 px-5 sm:mt-8 md:px-0">
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
  
  const {
    name,
    image,
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
      <div className="relative w-full flex justify-center ">
        <Image
          src={image}
          alt={name}
          height={523}
          width={384}
          className="rounded-[24px] object-cover"
        />
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
