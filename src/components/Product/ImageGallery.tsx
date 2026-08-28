"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// import "react-inner-image-zoom/lib/styles.min.css";
// import InnerImageZoom from "react-inner-image-zoom";

import { Product } from "@/lib/shopify/types";
// import { useProductData } from "@/hooks/useProductData"; // uncomment with discount badge below
import ThumbsCarousel from "./ThumbsCarousel";

interface PropTypes {
  product: Product;
  selectedVariantId?: string | null;
}

const ImageGallery = (props: PropTypes) => {
  const { product, selectedVariantId } = props;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fallbackVariantImage, setFallbackVariantImage] = useState<{
    url: string;
    altText: string;
  } | null>(null);

  // const productData = useProductData(product); // uncomment with discount badge below

  const filteredImages = product?.images;

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);

  useEffect(() => {
    const variantImage = selectedVariant?.image;
    if (!variantImage?.url) {
      setFallbackVariantImage(null);
      return;
    }

    const matchIndex = product.images.findIndex(
      (img) => img.url === variantImage.url
    );

    if (matchIndex >= 0) {
      setCurrentImageIndex(matchIndex);
      setFallbackVariantImage(null);
    } else {
      setFallbackVariantImage({
        url: variantImage.url,
        altText: variantImage.altText || product.title,
      });
    }
  }, [selectedVariant, product.images, product.title]);

  // Hidden for now — uncomment to show discount badge on product image
  // const weightOptionName = "weight";
  // const halfKgVariant = product.variants.find((v) =>
  //   v.selectedOptions.some(
  //     (o) =>
  //       o.name.toLowerCase() === weightOptionName &&
  //       /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " "))
  //   )
  // );
  // const currentAmount =
  //   halfKgVariant?.price?.amount || productData.currentPrice;
  // const compareAmount =
  //   halfKgVariant?.compareAtPrice?.amount || productData.comparePrice;
  // const calculateDiscountPercentage = (
  //   currentPrice: string,
  //   comparePrice: string
  // ) => {
  //   const current = parseFloat(currentPrice);
  //   const compare = parseFloat(comparePrice);
  //   if (isNaN(current) || isNaN(compare) || compare <= 0 || current >= compare) {
  //     return 0;
  //   }
  //   return Math.round(((compare - current) / compare) * 100);
  // };
  // const displayDiscountPercentage = calculateDiscountPercentage(
  //   currentAmount,
  //   compareAmount
  // );

  const previewImage = fallbackVariantImage || {
    url: product?.images[currentImageIndex]?.url,
    altText: product?.images[currentImageIndex]?.altText,
  };

  const isAzadiSaleProduct = product.collections?.some(
    (collection) => collection.handle === "azadi-sale"
  );
  const objectFitClass = isAzadiSaleProduct ? "object-fill" : "object-cover";

  // Keep a small fade when the active image changes

  return (
    <div className="w-full md:w-fit">
      <div className="relative w-full overflow-hidden rounded-[16px] md:h-[550px] md:w-[520px]">
        {/* Current Image */}
        <Image
          src={previewImage.url}
          alt={previewImage.altText}
          fill
          className={`${objectFitClass} md:block hidden`}
          priority
          // width={520}
          // height={520}
        />

        <Image
          src={previewImage.url}
          alt={previewImage.altText}
          // fill
          className={`${objectFitClass} block md:hidden`}
          // priority
          width={520}
          height={520}
        />

        {/* {displayDiscountPercentage > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-white text-black px-3 py-2 rounded-[20px] text-sm font-semibold text-center whitespace-nowrap">
              Discount {displayDiscountPercentage}% Off
            </div>
          </div>
        )} */}

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
        onActiveIndexChange={(index) => {
          setFallbackVariantImage(null);
          setCurrentImageIndex(index);
        }}
      />
    </div>
  );
};

export default ImageGallery;
