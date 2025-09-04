import React from "react";

import { Product } from "@/lib/shopify/types";

import ProductDetails from "./ProductDetails";
import ImageGallery from "./ImageGallery";

interface PropTypes {
  product: Product;
}

const index = (props: PropTypes) => {
  const { product } = props;
  // console.log("product", product);

  return (
    <div className="mx-auto flex max-w-[1117px] flex-wrap flex-col gap-10 px-5 py-10 md:flex-row md:px-4 md:py-0">
      <ImageGallery product={product} />
      <div className="w-full max-w-[521px]">
        <ProductDetails product={product} />
      </div>
    </div>
  );
};

export default index;
