"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BagIcon, MinusIcon, PlusIcon } from "@/ui/Icons";
import { Button } from "@/ui/button";
import { Product } from "@/lib/shopify/types";
import useShoppingCart from "@/hooks/useShoppingCart";
import Tag from "@/ui/Tag";
import { cn } from "@/lib/utils";

import ProductAccordion from "./Accordion";

const STICKY_OFFSET_PX = 50;

interface PropTypes {
  product: Product;
  onVariantChange?: (variantId: string) => void;
}

const ProductVariantSelector = (props: PropTypes) => {
  const { product, onVariantChange } = props;
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isStuck, setIsStuck] = useState(false);
  const inFlowRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const { getItemQuantity, addCartQuantity, onCartOpen, isCartOpen } =
    useShoppingCart();

  const quantity = getItemQuantity(product?.id as string);
  const sizes = useMemo(
    () =>
      product.options.find((option) => option.name.toLowerCase() === "weight")
        ?.values || [],
    [product]
  );

  const isStickyActive = isStuck && !isCartOpen;

  useEffect(() => {
    setItemQuantity(quantity);
  }, [quantity]);

  // Show fixed bar after in-flow ATC clears the viewport bottom by 50px.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const inFlow = inFlowRef.current;
    if (!inFlow) return;

    const update = () => {
      if (!mediaQuery.matches || isCartOpen) {
        setIsStuck(false);
        return;
      }

      const { top, bottom } = inFlow.getBoundingClientRect();
      setIsStuck(
        top < window.innerHeight &&
          bottom < window.innerHeight - STICKY_OFFSET_PX
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    mediaQuery.addEventListener("change", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mediaQuery.removeEventListener("change", update);
      setIsStuck(false);
    };
  }, [isCartOpen]);

  // Lift mute / SalesPopup using the sticky bar's measured height.
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const applyOffset = () => {
      const bar = stickyBarRef.current;
      if (mediaQuery.matches && isStickyActive && bar) {
        root.style.setProperty("--sticky-cta-offset", `${bar.offsetHeight}px`);
      } else {
        root.style.removeProperty("--sticky-cta-offset");
      }
    };

    const raf = requestAnimationFrame(applyOffset);
    mediaQuery.addEventListener("change", applyOffset);
    window.addEventListener("resize", applyOffset);

    const bar = stickyBarRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && bar
        ? new ResizeObserver(applyOffset)
        : null;
    if (bar && observer) observer.observe(bar);

    return () => {
      cancelAnimationFrame(raf);
      mediaQuery.removeEventListener("change", applyOffset);
      window.removeEventListener("resize", applyOffset);
      observer?.disconnect();
      root.style.removeProperty("--sticky-cta-offset");
    };
  }, [isStickyActive]);

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
            option.value === selectedSize
        )
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

  const qtyControl = (compact?: boolean) => (
    <div
      className={cn(
        "flex items-center justify-center rounded-[62px] bg-[#F0F0F0] px-4 py-3",
        compact
          ? "min-w-0 flex-1 gap-4"
          : "w-full gap-5 md:w-fit md:gap-[50px] md:px-[22px] md:py-[17px]"
      )}
    >
      <MinusIcon className="cursor-pointer" onClick={onDecrease} />
      <span className="min-w-[1.25rem] text-center">{itemQuantity}</span>
      <PlusIcon className="cursor-pointer" onClick={onIncrease} />
    </div>
  );

  const addToCartButton = (compact?: boolean) => (
    <Button
      onClick={onAddToCart}
      className={cn(
        "flex min-h-[48px] items-center justify-center bg-black text-[16px] font-semibold capitalize",
        compact ? "min-w-0 flex-1" : "w-full md:w-fit md:min-h-0"
      )}
    >
      <BagIcon /> Add to cart
    </Button>
  );

  return (
    <>
      <div className="mt-1 flex flex-col gap-1">
        {sizes.length > 1 && (
          <ProductAccordion title="Choose Weight">
            <div className="mt-2 -mb-3 flex items-center gap-1">
              {sizes.map((size) => (
                <Tag
                  key={size}
                  title={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "cursor-pointer",
                    selectedSize === size
                      ? "bg-black text-white"
                      : "border-[#DDDDDD]"
                  )}
                />
              ))}
            </div>
          </ProductAccordion>
        )}
      </div>

      {/* In-flow ATC — stacked on mobile; fades out when sticky bar shows */}
      <div
        ref={inFlowRef}
        className={cn(
          "mt-4 flex flex-col items-stretch gap-3 pt-10 transition-opacity duration-200 md:flex-row md:items-center md:gap-4",
          isStickyActive &&
            "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100"
        )}
      >
        {qtyControl()}
        {addToCartButton()}
      </div>

      {/* Sticky 50/50 ATC — slides in on mobile only */}
      <div
        ref={stickyBarRef}
        aria-hidden={!isStickyActive}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100] border-t border-[#E5E5E5] bg-white px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out md:hidden pb-[max(12px,env(safe-area-inset-bottom))]",
          isStickyActive
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex w-full max-w-[521px] flex-row items-center gap-2">
          {qtyControl(true)}
          {addToCartButton(true)}
        </div>
      </div>
    </>
  );
};

export default ProductVariantSelector;
