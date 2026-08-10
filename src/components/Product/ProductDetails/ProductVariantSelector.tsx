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

interface PropTypes {
  product: Product;
  onVariantChange?: (variantId: string) => void;
}

const ProductVariantSelector = (props: PropTypes) => {
  const { product, onVariantChange } = props;
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isStuck, setIsStuck] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isStuckRef = useRef(false);
  const stuckHeightRef = useRef(0);
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

  // Pin the same ATC to the bottom as soon as it reaches the viewport bottom
  // (while still visible) — not after it scrolls off-screen.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const setStuck = (next: boolean, height?: number) => {
      isStuckRef.current = next;
      if (next && typeof height === "number") {
        stuckHeightRef.current = height;
      }
      setIsStuck(next);
    };

    const update = () => {
      const sentinel = sentinelRef.current;
      const node = controlsRef.current;
      if (!sentinel || !node || !mediaQuery.matches || isCartOpen) {
        setStuck(false);
        return;
      }

      const h = isStuckRef.current
        ? stuckHeightRef.current || sentinel.offsetHeight
        : sentinel.offsetHeight;
      const shouldStick =
        sentinel.getBoundingClientRect().top <= window.innerHeight - h;

      if (shouldStick) {
        if (!isStuckRef.current) setStuck(true, sentinel.offsetHeight);
      } else if (isStuckRef.current) {
        setStuck(false);
      }
    };

    const onViewportChange = () => {
      if (!mediaQuery.matches) setStuck(false);
      update();
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    mediaQuery.addEventListener("change", onViewportChange);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mediaQuery.removeEventListener("change", onViewportChange);
      setStuck(false);
    };
  }, [isCartOpen]);

  // Lift floating UI only while the ATC is actually pinned to the bottom.
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const applyOffset = () => {
      if (mediaQuery.matches && isStickyActive) {
        root.style.setProperty("--sticky-cta-offset", "9.5rem");
      } else {
        root.style.removeProperty("--sticky-cta-offset");
      }
    };

    applyOffset();
    mediaQuery.addEventListener("change", applyOffset);

    return () => {
      mediaQuery.removeEventListener("change", applyOffset);
      root.style.removeProperty("--sticky-cta-offset");
    };
  }, [isStickyActive]);

  // Initialize selected size on component mount
  useEffect(() => {
    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes]);

  // Notify parent when selected size changes
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

  return (
    <>
      <div className="mt-1 flex flex-col gap-1">
        {/* Color selection removed */}

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

      {/* Sentinel marks the natural ATC position; collapses when pinned (no gap) */}
      <div
        ref={sentinelRef}
        className={cn(!isStickyActive && "mt-4")}
        aria-hidden={isStickyActive || undefined}
      >
        {/* Single qty + ATC — pins at bottom when it reaches the viewport edge */}
        <div
          ref={controlsRef}
          className={cn(
            "flex flex-col items-stretch justify-between gap-3 pt-10 md:flex-row md:items-center md:gap-4 md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pt-10 md:shadow-none md:pb-0",
            isStickyActive &&
              "fixed inset-x-0 bottom-0 z-[100] border-t border-[#E5E5E5] bg-white px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[max(12px,env(safe-area-inset-bottom))] md:relative md:inset-auto"
          )}
        >
          <div className="mx-auto flex w-full max-w-[521px] flex-col gap-3 md:mx-0 md:max-w-none md:flex-row md:items-center md:justify-between md:gap-4">
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
        </div>
      </div>
    </>
  );
};

export default ProductVariantSelector;
