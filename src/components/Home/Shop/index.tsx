import React from "react";
import Image from "next/image";
import Link from "next/link";

import Text from "@/ui/Text";
import { formatPrice } from "@/lib/utils/shopify";
import { Product } from "@/lib/shopify/types";

import Sizes from "./Sizes";
import Colors from "./Colors";

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
  // Extract relevant data from the Shopify Product type
  const name = product.title;
  const price = product.priceRange.minVariantPrice.amount;

  // const description = product.description;
  const image = product.featuredImage?.url || "/images/placeholder.png"; // Use placeholder if no image
  const sizes =
    product.options.find((option) => option.name.toLowerCase() === "size")
      ?.values || [];
  const colors =
    product.options.find((option) => option.name.toLowerCase() === "color")
      ?.values || [];

  return (
    <div className="w-full md:w-[384px]">
      <div className="relative w-full">
        <Image
          src={image}
          alt={name}
          height={523}
          width={384}
          className="rounded-[24px] object-cover"
        />

        <Sizes product={product} sizes={sizes} />
      </div>

      <div className="my-2 flex items-start justify-between">
        <Text className="text-primary-foreground text-[22px] font-semibold">
          {name}
        </Text>
        <Text className="text-primary-foreground text-[22px] font-semibold">
          {formatPrice(price)}
        </Text>
      </div>

      {/* <Text className="text-caption line-clamp-4">{description}</Text> */}

      <Colors product={product} colors={colors} showColorName />
    </div>
  );
};
