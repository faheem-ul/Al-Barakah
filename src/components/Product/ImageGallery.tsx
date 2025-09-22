"use client";
import React, { useState } from "react";
import Image from "next/image";

// import "react-inner-image-zoom/lib/styles.min.css";
// import InnerImageZoom from "react-inner-image-zoom";

import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import ThumbsCarousel from "./ThumbsCarousel";

interface PropTypes {
  product: Product;
}

const ImageGallery = (props: PropTypes) => {
  const { product } = props;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const productData = useProductData(product);

  const filteredImages = product?.images;

  // Determine preferred variant (1/2kg) for discount consistency with cards
  const weightOptionName = "weight";
  const halfKgVariant = product.variants.find((v) =>
    v.selectedOptions.some(
      (o) =>
        o.name.toLowerCase() === weightOptionName &&
        /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " "))
    )
  );

  const currentAmount =
    halfKgVariant?.price?.amount || productData.currentPrice;
  const compareAmount =
    halfKgVariant?.compareAtPrice?.amount || productData.comparePrice;

  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);

    if (
      isNaN(current) ||
      isNaN(compare) ||
      compare <= 0 ||
      current >= compare
    ) {
      return 0;
    }

    const discount = ((compare - current) / compare) * 100;
    return Math.round(discount);
  };

  const displayDiscountPercentage = calculateDiscountPercentage(
    currentAmount,
    compareAmount
  );

  // Keep a small fade when the active image changes

  return (
    <div className="w-full md:w-fit">
      <div className="relative w-full overflow-hidden rounded-[16px] md:h-[550px] md:w-[520px]">
        {/* Current Image */}
        <Image
          src={product?.images[currentImageIndex]?.url}
          alt={product?.images[currentImageIndex]?.altText}
          fill
          className="object-cover md:block hidden"
          priority
          // width={520}
          // height={520}
        />

        <Image
          src={product?.images[currentImageIndex]?.url}
          alt={product?.images[currentImageIndex]?.altText}
          // fill
          className="object-cover block md:hidden"
          // priority
          width={520}
          height={520}
        />

        {/* Sale Badge - positioned at bottom center */}
        {displayDiscountPercentage > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-white text-black px-3 py-2 rounded-[20px] text-sm font-semibold">
              Dsicount {displayDiscountPercentage}% Off
            </div>
          </div>
        )}

        {/* <InnerImageZoom
          className="object-cover object-top"
          src={product?.images[currentImageIndex]?.url}
          zoomSrc={product?.images[currentImageIndex]?.url}
          zoomPreload={true}
          zoomType="hover"
        /> */}
      </div>

      {/* Thumbnails Carousel */}
      <ThumbsCarousel
        images={filteredImages || []}
        activeIndex={currentImageIndex}
        onActiveIndexChange={setCurrentImageIndex}
      />
    </div>
  );
};

export default ImageGallery;
