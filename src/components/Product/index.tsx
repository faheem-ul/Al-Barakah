"use client";

import React, { useState } from "react";

import { Product } from "@/lib/shopify/types";

import ProductDetails from "./ProductDetails";
import ImageGallery from "./ImageGallery";

interface PropTypes {
  product: Product;
}

const ProductView = (props: PropTypes) => {
  const { product } = props;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );

  return (
    <div className="mx-auto flex max-w-[1117px] flex-col flex-wrap gap-10 px-5 py-10 md:flex-row md:px-4 md:py-0">
      <ImageGallery
        product={product}
        selectedVariantId={selectedVariantId}
      />
      <div className="w-full max-w-[521px]">
        <ProductDetails
          product={product}
          selectedVariantId={selectedVariantId}
          onVariantChange={setSelectedVariantId}
        />
      </div>
    </div>
  );
};

export default ProductView;
