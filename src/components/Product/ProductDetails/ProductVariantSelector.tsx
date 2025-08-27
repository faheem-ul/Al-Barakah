"use client";
import React, { SVGProps, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BagIcon, MinusIcon, PlusIcon } from "@/ui/Icons";
import { Button } from "@/ui/button";
import { Product } from "@/lib/shopify/types";
import useShoppingCart from "@/hooks/useShoppingCart";
import Tag from "@/ui/Tag";
import { cn } from "@/lib/utils";

import ProductAccordion from "./Accordion";

interface PropTypes {
  product: Product;
}

const ProductVariantSelector = (props: PropTypes) => {
  const { product } = props;
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const { getItemQuantity, addCartQuantity, onCartOpen } = useShoppingCart();

  const quantity = getItemQuantity(product?.id as string);
  const sizes = useMemo(
    () =>
      product.options.find((option) => option.name.toLowerCase() === "size")
        ?.values || [],
    [product]
  );

  useEffect(() => {
    setItemQuantity(quantity);
  }, [quantity]);

  // Initialize selected size on component mount
  useEffect(() => {
    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes]);

  const onIncrease = () => setItemQuantity((prev) => prev + 1);
  const onDecrease = () => {
    setItemQuantity((prev) => {
      if (prev > 1) {
        return prev - 1;
      } else {
        return 1;
      }
    });
  };

  const onAddToCart = () => {
    // Only block when multiple sizes exist and none is selected
    if (sizes.length > 1 && !selectedSize) {
      toast.warning("Please select a size before adding to cart.");
      return;
    }

    onCartOpen();

    // Determine size to use when one or zero sizes
    const sizeToUse = selectedSize || sizes[0];

    // Resolve variant by size when available; otherwise fallback to first variant
    const variant =
      product.variants.find((v) =>
        v.selectedOptions.some(
          (option) =>
            option.name.toLowerCase() === "size" &&
            option.value === (sizeToUse as string)
        )
      ) || product.variants[0];

    if (!variant) {
      console.error("No available variant found");
      toast.error("Sorry, this item is not available.");
      return;
    }

    addCartQuantity(
      product?.id as string,
      itemQuantity,
      "",
      sizeToUse || "",
      variant.id
    );
  };

  return (
    <>
      <div className="mt-1 flex flex-col gap-1">
        {/* Color selection removed */}

        {sizes.length > 1 && (
          <ProductAccordion title="Choose Size">
            <div className="mt-2 -mb-3 flex items-center gap-1">
              {sizes.map((size) => (
                <Tag
                  key={size}
                  title={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "cursor-pointer",
                    selectedSize === size
                      ? "border-[#272728]"
                      : "border-[#DDDDDD]"
                  )}
                />
              ))}
            </div>
          </ProductAccordion>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-6">
        <div className="flex w-fit items-center gap-[50px] rounded-[62px] bg-[#F0F0F0] px-[22px] py-[17px]">
          <MinusIcon className="cursor-pointer" onClick={onDecrease} />
          <span>{itemQuantity}</span>
          <PlusIcon className="cursor-pointer" onClick={onIncrease} />
        </div>

        <Button
          onClick={onAddToCart}
          className="text-[14px] font-medium uppercase bg-black"
        >
          <BagIcon /> Add to cart
        </Button>
      </div>
    </>
  );
};

export default ProductVariantSelector;
