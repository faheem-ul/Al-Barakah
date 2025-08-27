import React from "react";
import Image from "next/image";
import { SVGProps } from "react";
import Link from "next/link";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";

interface PropTypes {
  product: Product;
  selectedSize: string;
  selectedColor: string;
}

const ToastProductItem = (props: PropTypes) => {
  const { product, selectedSize } = props;
  const image = product.featuredImage?.url || "/images/placeholder.png"; // Use placeholder if no image
  const name = product.title;

  return (
    <Link href="/cart">
      <div className="mx-auto flex h-[124px] w-full items-center justify-between rounded-[16px] bg-[#F7F7F7] p-3 shadow-lg md:ml-[-48px] md:w-[480px]">
        <div className="flex items-center gap-4">
          <div className="relative h-[100px] w-[100px]">
            <Image
              src={image}
              alt={name}
              className="rounded-[14px] object-cover"
              fill
              sizes="33vw"
            />
          </div>

          <div className="max-w-[70%]">
            <Text className="text-[14px] font-normal text-[#1D1D1B] md:text-[20px]">
              Added to Bag
            </Text>

            <Text className="text-[14px] font-semibold text-[#1D1D1B] md:text-[20px]">
              {product?.title}, Size {selectedSize && selectedSize}
            </Text>
          </div>
        </div>

        <CheckIcon className="shrink-0" />
      </div>
    </Link>
  );
};

export default ToastProductItem;

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={28}
    height={28}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14 .667c7.364 0 13.333 5.97 13.333 13.333 0 7.364-5.969 13.333-13.333 13.333S.667 21.363.667 14C.667 6.636 6.637.667 14 .667Zm7.44 8.114a1.178 1.178 0 0 0-1.65 0l-8 7.969-3.579-3.565c-.451-.45-1.199-.45-1.65 0a1.166 1.166 0 0 0 0 1.642l4.404 4.388a1.169 1.169 0 0 0 1.65 0l8.825-8.79a1.167 1.167 0 0 0 0-1.644Z"
      fill="#8FB69F"
    />
  </svg>
);
