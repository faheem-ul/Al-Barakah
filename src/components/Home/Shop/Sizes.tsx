"use client";
import React, { useEffect, useState } from "react";
import { SVGProps } from "react";
import { toast } from "sonner";

import Text from "@/ui/Text";
import { Product } from "@/lib/shopify/types";
import { isOptionAvailable } from "@/lib/utils/shopify";
import { cn } from "@/lib/utils";
import useShoppingCart from "@/hooks/useShoppingCart";

// import ToastProductItem from "./ToastProductItem";

interface PropTypes {
  product: Product;
  sizes: string[];
}

const smallCircle = ["s", "m", "l"];

const Sizes = (props: PropTypes) => {
  const { product, sizes } = props;

  const [selectedSize, setSelectedSize] = useState<string | undefined>();

  const { addCartQuantity, onCartOpen } = useShoppingCart();

  const onAddToCart = () => {
    onCartOpen();

    // Determine size to use
    let sizeToUse: string | undefined = selectedSize;
    if (sizes.length === 1) {
      sizeToUse = sizes[0];
    }

    // If multiple sizes exist and none selected, block add
    if (sizes.length > 1 && !sizeToUse) {
      toast.warning("Please select a size before adding to cart.");
      return;
    }

    // Resolve variant by size only; if no size option exists, pick the first variant
    const variant =
      product.variants.find((v) =>
        v.selectedOptions.some(
          (option) =>
            option.name.toLowerCase() === "size" &&
            option.value === (sizeToUse as string)
        )
      ) || product.variants[0];

    if (!variant) {
      toast.error("No available variant found.");
      return;
    }

    addCartQuantity(product?.id as string, 1, "", sizeToUse || "", variant.id);

    // toast.custom(
    //   () => (
    //     <ToastProductItem
    //       product={product}
    //       selectedSize={selectedSize as string}
    //       selectedColor={selectedColor as string}
    //     />
    //   ),
    //   {
    //     position: "bottom-center",
    //     unstyled: true,
    //   },
    // );
  };

  useEffect(() => {
    if (sizes.length === 1) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes]);

  const hasSizeOption =
    Array.isArray(product?.options) &&
    product.options.some((o) => o?.name?.toLowerCase() === "size");

  return (
    <div
      className="absolute bottom-[20px] left-[50%] flex -translate-x-[50%] items-center"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className={cn(
          " min-h-[40px] items-center justify-center gap-4 rounded-[20px] bg-white px-4 py-1",
          hasSizeOption ? "flex" : "hidden"
        )}
      >
        {sizes.map((size) => {
          const isAvailable = isOptionAvailable(product, "size", size);

          const isSmallCircle = smallCircle.includes(size.toLocaleLowerCase());

          const isSelected = selectedSize === size && sizes.length > 1;

          return (
            <Text
              onClick={() => {
                if (!isAvailable || sizes.length === 1) return;

                setSelectedSize(size);
              }}
              key={size}
              className={cn(
                "text-[14px] text-[#1F150A] hover:cursor-pointer",
                isSelected &&
                  "flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#161616] text-white",
                isSelected && isSmallCircle && "h-[24px] w-[24px]",

                !isAvailable && "text-caption cursor-not-allowed line-through"
              )}
            >
              {size}
            </Text>
          );
        })}

        <button onClick={onAddToCart}>
          <AddIcon
            className="hover:cursor-pointer"
            fill={selectedSize || sizes.length === 1 ? "#8FB69F" : "#A9A4A133"}
          />
        </button>
      </div>
    </div>
  );
};

export default Sizes;

const AddIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={24}
    height={24}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width={24} height={24} rx={12} fill={props.fill} />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75Z"
      fill="#fff"
    />
  </svg>
);
