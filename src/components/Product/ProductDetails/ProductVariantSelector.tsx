"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { BagIcon, MinusIcon, PlusIcon } from "@/ui/Icons";
import { Button } from "@/ui/button";
import { Product } from "@/lib/shopify/types";
import useShoppingCart from "@/hooks/useShoppingCart";
import Tag from "@/ui/Tag";
import Text from "@/ui/Text";
import { cn } from "@/lib/utils";

import ProductAccordion from "./Accordion";

interface PropTypes {
  product: Product;
  onVariantChange?: (variantId: string) => void;
}

const ProductVariantSelector = (props: PropTypes) => {
  const { product, onVariantChange } = props;
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const { getItemQuantity, addCartQuantity, onCartOpen } = useShoppingCart();

  const quantity = getItemQuantity(product?.id as string);
  const sizes = useMemo(
    () =>
      product.options.find((option) => option.name.toLowerCase() === "weight")
        ?.values || [],
    [product],
  );

  useEffect(() => {
    setItemQuantity(quantity);
  }, [quantity]);

  useEffect(() => {
    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes]);

  useEffect(() => {
    if (!selectedSize) return;
    const variant =
      product.variants.find((v) =>
        v.selectedOptions.some(
          (option) =>
            option.name.toLowerCase() === "weight" &&
            option.value === selectedSize,
        ),
      ) || product.variants[0];
    if (variant && onVariantChange) onVariantChange(variant.id);
  }, [selectedSize, product, onVariantChange]);

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
    if (sizes.length > 1 && !selectedSize) {
      toast.warning("Please select a size before adding to cart.");
      return;
    }

    onCartOpen();

    const sizeToUse = selectedSize || sizes[0];

    const variant =
      product.variants.find((v) =>
        v.selectedOptions.some(
          (option) =>
            option.name.toLowerCase() === "weight" &&
            option.value === (sizeToUse as string),
        ),
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
      variant.id,
    );
  };

  return (
    <>
      <div className="mt-1 flex flex-col gap-1">
        {sizes.length > 1 && (
          <ProductAccordion title="Choose Weight">
            <div className=" mb-3 flex items-center gap-1">
              {sizes.map((size) => (
                <Tag
                  key={size}
                  title={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "cursor-pointer",
                    selectedSize === size
                      ? "bg-black text-white"
                      : "border-[#DDDDDD]",
                  )}
                />
              ))}
            </div>
          </ProductAccordion>
        )}
      </div>

      <Text className="text-[16px] text-black">
        🚚 Free Home Delivery — Pay When You Receive
      </Text>

      <div className="mt-15 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex w-full items-center justify-center gap-5 rounded-[62px] bg-[#F0F0F0] px-4 py-3 md:w-fit md:gap-[50px] md:px-[22px] md:py-[17px]">
          <MinusIcon className="cursor-pointer" onClick={onDecrease} />
          <span className="min-w-[1.25rem] text-center">{itemQuantity}</span>
          <PlusIcon className="cursor-pointer" onClick={onIncrease} />
        </div>

        <Button
          onClick={onAddToCart}
          className="flex min-h-[48px] w-full items-center justify-center bg-black text-[16px] font-semibold capitalize md:w-fit md:min-h-0"
        >
          <BagIcon /> Add to cart
        </Button>
      </div>

      {/* food license certificate */}
      <a
        href="/images/Food License Certificate.webp"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block w-full max-w-[320px] overflow-hidden rounded-[16px] border border-[#EDE4D3] bg-[#F2EEE6] p-1.5 transition hover:opacity-90 md:max-w-[340px] md:p-2"
        aria-label="View Food License Certificate"
      >
        <Image
          src="/images/Food License Certificate.webp"
          alt="Al-Barakah Honey Food License Certificate"
          width={1754}
          height={1240}
          sizes="340px"
          className="h-auto w-full rounded-[10px] bg-white object-contain"
        />
      </a>
    </>
  );
};

export default ProductVariantSelector;
