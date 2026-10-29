"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Product } from "@/lib/shopify/types";
import { useProductData } from "@/hooks/useProductData";
import { HERO_SIZES } from "@/components/Product/ProductHeroImage";
import { isAzadiSaleProduct } from "@/components/Product/productAzadiSale";
import ThumbsCarousel from "./ThumbsCarousel";

interface PropTypes {
  product: Product;
  selectedVariantId?: string | null;
  /** Server-rendered LCP image (priority); shown until user changes image. */
  lcpHero?: React.ReactNode;
}

const ImageGallery = (props: PropTypes) => {
  const { product, selectedVariantId, lcpHero } = props;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fallbackVariantImage, setFallbackVariantImage] = useState<{
    url: string;
    altText: string;
  } | null>(null);

  const productData = useProductData(product);

  const filteredImages = product?.images;
  const initialImageUrl = product.images[0]?.url;

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
      (img) => img.url === variantImage.url,
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

  const weightOptionName = "weight";
  const halfKgVariant = product.variants.find((v) =>
    v.selectedOptions.some(
      (o) =>
        o.name.toLowerCase() === weightOptionName &&
        /(^|\s)(1\s*\/\s*2|0\.5)\s*kg?$/i.test(o.value.replace(/\s+/g, " ")),
    ),
  );
  const currentAmount =
    selectedVariant?.price?.amount ||
    halfKgVariant?.price?.amount ||
    productData.currentPrice;
  const compareAmount =
    selectedVariant?.compareAtPrice?.amount ||
    halfKgVariant?.compareAtPrice?.amount ||
    productData.comparePrice;
  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string,
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);
    if (isNaN(current) || isNaN(compare) || compare <= 0 || current >= compare) {
      return 0;
    }
    return Math.round(((compare - current) / compare) * 100);
  };
  const displayDiscountPercentage = calculateDiscountPercentage(
    currentAmount,
    compareAmount,
  );

  const previewImage = fallbackVariantImage || {
    url: product?.images[currentImageIndex]?.url,
    altText: product?.images[currentImageIndex]?.altText,
  };

  const objectFitClass = isAzadiSaleProduct(product)
    ? "object-fill"
    : "object-cover";

  const needsClientHero =
    Boolean(fallbackVariantImage) ||
    currentImageIndex !== 0 ||
    Boolean(
      previewImage.url &&
        initialImageUrl &&
        previewImage.url !== initialImageUrl,
    );

  return (
    <div className="w-full md:w-fit">
      <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-[16px] md:aspect-auto md:h-[550px] md:w-[520px]">
        {lcpHero}
        {needsClientHero && previewImage.url && (
          <Image
            src={previewImage.url}
            alt={previewImage.altText || product.title}
            fill
            sizes={HERO_SIZES}
            className={`${objectFitClass} absolute inset-0 z-[1]`}
          />
        )}

        {displayDiscountPercentage > 0 && (
          <div className="absolute bottom-4 left-1/2 z-[2] -translate-x-1/2 transform">
            <div className="rounded-[20px] bg-white px-3 py-2 text-center text-sm font-semibold whitespace-nowrap text-black">
              Discount {displayDiscountPercentage}% Off
            </div>
          </div>
        )}
      </div>

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
