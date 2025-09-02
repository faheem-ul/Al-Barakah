"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";

// import "react-inner-image-zoom/lib/styles.min.css";
// import InnerImageZoom from "react-inner-image-zoom";

import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { useProductData } from "@/hooks/useProductData";

interface PropTypes {
  product: Product;
}

const ImageGallery = (props: PropTypes) => {
  const { product } = props;
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(6); // Start with index 5
  const [isTransitioning, setIsTransitioning] = useState(false);

  const productData = useProductData(product);

  // Filter images to start from index 2 (skip first two images)
  const filteredImages = product?.images?.slice(2) || [];

  // Handle smooth image transitions
  useEffect(() => {
    if (hoveredImage !== null) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setCurrentImageIndex(hoveredImage);
        setIsTransitioning(false);
      }, 200); // Half of the transition time
      return () => clearTimeout(timer);
    } else {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setCurrentImageIndex(6); // Return to index 5 when not hovering
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [hoveredImage]);

  return (
    <div className="w-full overflow-hidden md:w-fit">
      <div className="relative h-[338px] w-full overflow-hidden rounded-[16px] md:h-[550px] md:w-[520px]">
        {/* Current Image */}
        <Image
          src={product?.images[currentImageIndex]?.url}
          alt={product?.images[currentImageIndex]?.altText}
          fill
          className={cn(
            "object-center transition-opacity duration-500 ease-in-out w-full",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

      {/* Products Images */}
      <div className="no-scrollbar mt-4 flex max-w-screen items-center gap-[13px] overflow-x-auto md:max-w-[520px]">
        {filteredImages?.map((image, index) => (
          <div
            key={index + 2} // Use original index + 2 for proper key
            className={cn(
              "relative h-[80px] w-[78px] shrink-0 overflow-hidden rounded-[16px] md:h-[120px] md:w-[120px]",
              hoveredImage === index + 2 && "border-2 border-[#302A25]",
            )}
            onMouseEnter={() => setHoveredImage(index + 2)}
            onMouseLeave={() => setHoveredImage(null)}
          >
            <Image
              src={image?.url}
              alt={image?.altText}
              fill
              className={cn("object-cover object-top hover:cursor-pointer")}
              sizes="50vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
