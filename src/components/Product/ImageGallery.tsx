"use client";
import React, { useState } from "react";
import Image from "next/image";

// import "react-inner-image-zoom/lib/styles.min.css";
// import InnerImageZoom from "react-inner-image-zoom";

import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

interface PropTypes {
  product: Product;
}

const ImageGallery = (props: PropTypes) => {
  const { product } = props;
  const [currentImage, setCurrentImage] = useState(0);

  return (
    <div className="w-full overflow-hidden md:w-fit">
      <div className="relative h-[338px] w-full overflow-hidden rounded-[16px] md:h-[550px] md:w-[520px]">
        <Image
          src={product?.images[currentImage]?.url}
          alt={product?.images[currentImage]?.altText}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />

        {/* <InnerImageZoom
          className="object-cover object-top"
          src={product?.images[currentImage]?.url}
          zoomSrc={product?.images[currentImage]?.url}
          zoomPreload={true}
          zoomType="hover"
        /> */}
      </div>

      {/* Products Images */}
      <div className="no-scrollbar mt-4 flex max-w-screen items-center gap-[13px] overflow-x-auto md:max-w-[520px]">
        {product?.images?.map((image, index) => (
          <div
            key={index}
            className={cn(
              "relative h-[80px] w-[78px] shrink-0 overflow-hidden rounded-[16px] md:h-[120px] md:w-[120px]",
              currentImage === index && "border-2 border-[#302A25]",
            )}
          >
            <Image
              src={image?.url}
              alt={image?.altText}
              fill
              className={cn("object-cover object-top hover:cursor-pointer")}
              sizes="50vw"
              onClick={() => setCurrentImage(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
