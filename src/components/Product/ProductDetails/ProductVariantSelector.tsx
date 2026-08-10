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

/** Extra scroll past the in-flow ATC before sticky mode starts. */
const STICKY_OFFSET_PX = 140;
const COLLAPSE_MS = 320;
/** Let default ATC start fading before the fixed bar slides in. */
const FIXED_REVEAL_DELAY_MS = 160;

interface PropTypes {
  product: Product;
  onVariantChange?: (variantId: string) => void;
}

const ProductVariantSelector = (props: PropTypes) => {
  const { product, onVariantChange } = props;
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isStuck, setIsStuck] = useState(false);
  const [showFixedBar, setShowFixedBar] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const collapseRef = useRef<HTMLDivElement>(null);
  const inFlowRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const isStuckRef = useRef(false);
  const wasStickyRef = useRef(false);
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

  // Slide in the bottom bar after in-flow ATC clears the viewport.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const setStuck = (next: boolean) => {
      isStuckRef.current = next;
      setIsStuck(next);
    };

    const update = () => {
      const sentinel = sentinelRef.current;
      const inFlow = inFlowRef.current;
      if (!sentinel || !inFlow || !mediaQuery.matches || isCartOpen) {
        setStuck(false);
        return;
      }

      if (!isStuckRef.current) {
        const { top, bottom } = inFlow.getBoundingClientRect();
        setStuck(
          top < window.innerHeight &&
            bottom < window.innerHeight - STICKY_OFFSET_PX
        );
      } else {
        // Anchor stays in place after in-flow collapses — unstick when it
        // returns near the viewport bottom (avoids re-stick flicker).
        setStuck(
          sentinel.getBoundingClientRect().top <
            window.innerHeight - STICKY_OFFSET_PX
        );
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

  // Explicit height/opacity animation so collapse never snaps.
  useEffect(() => {
    const wrap = collapseRef.current;
    const inner = inFlowRef.current;
    if (!wrap || !inner) return;

    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) {
      wrap.style.height = "";
      wrap.style.opacity = "";
      wrap.style.marginTop = "";
      wrap.style.overflow = "";
      wrap.style.transition = "";
      wasStickyRef.current = false;
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = reduceMotion ? 0 : COLLAPSE_MS;

    if (isStickyActive && !wasStickyRef.current) {
      const startHeight = wrap.scrollHeight || inner.scrollHeight;
      wrap.style.overflow = "hidden";
      wrap.style.height = `${startHeight}px`;
      wrap.style.opacity = "1";
      wrap.style.marginTop = "16px";
      void wrap.offsetHeight;
      wrap.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out, margin-top ${duration}ms ease-out`;
      wrap.style.height = "0px";
      wrap.style.opacity = "0";
      wrap.style.marginTop = "0px";
      wasStickyRef.current = true;
      return;
    }

    if (!isStickyActive && wasStickyRef.current) {
      const target = inner.scrollHeight;
      wrap.style.overflow = "hidden";
      wrap.style.height = "0px";
      wrap.style.opacity = "0";
      wrap.style.marginTop = "0px";
      void wrap.offsetHeight;
      wrap.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out, margin-top ${duration}ms ease-out`;
      wrap.style.height = `${target}px`;
      wrap.style.opacity = "1";
      wrap.style.marginTop = "16px";
      wasStickyRef.current = false;

      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "height") return;
        wrap.style.height = "auto";
        wrap.style.overflow = "";
        wrap.style.transition = "";
        wrap.removeEventListener("transitionend", onEnd);
      };
      wrap.addEventListener("transitionend", onEnd);
      return () => wrap.removeEventListener("transitionend", onEnd);
    }
  }, [isStickyActive]);

  // Reveal fixed bar after default has started fading.
  useEffect(() => {
    if (!isStickyActive) {
      setShowFixedBar(false);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const delay = reduceMotion ? 0 : FIXED_REVEAL_DELAY_MS;
    const timer = window.setTimeout(() => setShowFixedBar(true), delay);
    return () => window.clearTimeout(timer);
  }, [isStickyActive]);

  // Lift mute / SalesPopup using the sticky bar's measured height.
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const applyOffset = () => {
      const bar = stickyBarRef.current;
      if (mediaQuery.matches && showFixedBar && bar) {
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
  }, [showFixedBar]);

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

      {/* Zero-height anchor — stays put for scroll math when in-flow collapses */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />

      {/* In-flow ATC — JS-driven fade + height collapse (no snap) */}
      <div ref={collapseRef} className="mt-4 md:mt-4">
        <div
          ref={inFlowRef}
          aria-hidden={isStickyActive || undefined}
          className={cn(
            "flex flex-col items-stretch gap-3 pt-10 md:flex-row md:items-center md:gap-4",
            isStickyActive && "pointer-events-none md:pointer-events-auto"
          )}
        >
          {qtyControl()}
          {addToCartButton()}
        </div>
      </div>

      {/* Sticky bar — delayed fade + slide up from the bottom on mobile only */}
      <div
        ref={stickyBarRef}
        aria-hidden={!showFixedBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100] border-t border-[#E5E5E5] bg-white px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-[transform,opacity] duration-300 ease-out will-change-[transform,opacity] md:hidden pb-[max(12px,env(safe-area-inset-bottom))]",
          showFixedBar
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
