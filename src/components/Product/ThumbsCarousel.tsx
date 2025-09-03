"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import type { NavigationOptions, SwiperOptions } from "swiper/types";
import { cn } from "@/lib/utils";

import backslide from "@/public/images/backslide.svg";
import nextslide from "@/public/images/next-slide.svg";

import "swiper/css";
import "swiper/css/navigation";

type ImageType = { url: string; altText?: string };

interface PropTypes {
  images: ImageType[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

type NavigationApi = {
  init: () => void;
  destroy: () => void;
  update: () => void;
};

const ThumbsCarousel = ({
  images,
  activeIndex,
  onActiveIndexChange,
}: PropTypes) => {
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

  // Refs for external nav buttons
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      // Prefer realIndex when loop is enabled
      const nextIdx =
        typeof swiper.realIndex === "number"
          ? swiper.realIndex
          : typeof swiper.activeIndex === "number"
          ? swiper.activeIndex
          : 0;
      onActiveIndexChange(nextIdx);
    },
    [onActiveIndexChange]
  );

  const handleSwiperInit = (swiper: SwiperType) => {
    setSwiperRef(swiper);
  };

  const handleThumbClick = (index: number) => {
    if (!swiperRef) return;
    // slideToLoop exists when loop is enabled
    if (
      typeof (swiperRef as SwiperType & { slideToLoop?: (i: number) => void })
        .slideToLoop === "function"
    ) {
      (
        swiperRef as SwiperType & { slideToLoop?: (i: number) => void }
      ).slideToLoop?.(index);
    } else {
      swiperRef.slideTo(index);
    }
    onActiveIndexChange(index);
  };

  // Wire up external buttons after both Swiper and buttons exist
  useEffect(() => {
    if (!swiperRef || !prevRef.current || !nextRef.current) return;

    // Ensure navigation options exist and assign elements
    const params = swiperRef.params as SwiperOptions;
    const navParams: NavigationOptions = (
      typeof params.navigation === "boolean" || !params.navigation
        ? {}
        : params.navigation
    ) as NavigationOptions;

    navParams.prevEl = prevRef.current;
    navParams.nextEl = nextRef.current;
    params.navigation = navParams;

    // Re-init navigation to pick up new elements
    const nav = swiperRef.navigation as unknown as NavigationApi | undefined;
    if (nav) {
      nav.destroy();
      nav.init();
      nav.update();
    }
  }, [swiperRef]);

  if (!Array.isArray(images) || images.length === 0) return null;

  return (
    <div className="no-scrollbar mt-4 md:max-w-[520px]">
      <Swiper
        modules={[Navigation]}
        onSwiper={handleSwiperInit}
        onSlideChange={handleSlideChange}
        slidesPerView={4}
        spaceBetween={13}
        loop
        // Important: let us control nav via refs; don't pass selectors here
        navigation={false}
        className="w-full"
      >
        {images.map((image, index) => (
          <SwiperSlide key={`${image.url}-${index}`}>
            <div
              className={cn(
                "relative h-[80px] w-[78px] overflow-hidden rounded-[16px] md:h-[120px] md:w-[120px]",
                activeIndex === index && "border-2 border-[#302A25]"
              )}
              onClick={() => handleThumbClick(index)}
              role="button"
              aria-label={`Thumbnail ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.altText || "product image"}
                fill
                className="object-cover object-top hover:cursor-pointer"
                sizes="50vw"
                priority={index === 0}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* External navigation: below images, 10px gap, black */}
      <div className="mt-2 flex justify-center gap-[10px]">
        <button
          ref={prevRef}
          aria-label="Previous"
          className="select-none flex cursor-pointer items-center justify-center rounded-full bg-black p-2"
          type="button"
        >
          <Image
            src={backslide}
            alt="backslide"
            className="h-[10px] w-[10px]"
          />
        </button>
        <button
          ref={nextRef}
          aria-label="Next"
          className="select-none flex cursor-pointer items-center justify-center rounded-full bg-black p-2"
          type="button"
        >
          <Image
            src={nextslide}
            alt="nextslide"
            className="h-[10px] w-[10px]"
          />
        </button>
      </div>
    </div>
  );
};

export default ThumbsCarousel;
