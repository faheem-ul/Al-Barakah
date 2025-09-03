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

  // Keep a small fade when the active image changes

  return (
    <div className="w-full overflow-hidden md:w-fit">
      <div className="relative h-[338px] w-full overflow-hidden rounded-[16px] md:h-[550px] md:w-[520px]">
        {/* Current Image */}
        <Image
          src={product?.images[currentImageIndex]?.url}
          alt={product?.images[currentImageIndex]?.altText}
          fill
          className="h-[520px] w-[550px]"
          priority
        />

        {/* Sale Badge - positioned at bottom center */}
        {productData.discountPercentage > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-white text-black px-3 py-2 rounded-[20px] text-sm font-semibold">
              Sale {productData.discountPercentage}% Off
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
