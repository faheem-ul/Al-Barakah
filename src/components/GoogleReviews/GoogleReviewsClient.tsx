"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Swiper as SwiperType } from "swiper";
import { A11y } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import type { GoogleReviewsSnapshot } from "@/lib/google-reviews";
import { GoogleWordmarkIcon } from "@/ui/Icons";

import {
  FALLBACK_SNAPSHOT,
  GOOGLE_REVIEWS_URL,
  GOOGLE_WRITE_REVIEW_URL,
} from "./constants";
import ReviewCard, { Stars } from "./ReviewCard";

import "swiper/css";
import "swiper/css/a11y";

type GoogleReviewsClientProps = {
  snapshot: GoogleReviewsSnapshot | null;
};

const GoogleReviewsClient = ({ snapshot }: GoogleReviewsClientProps) => {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const data = snapshot?.reviews.length ? snapshot : FALLBACK_SNAPSHOT;

  return (
    <section
      className="px-4 pt-6 pb-14 sm:px-5 md:pt-10 md:pb-20"
      aria-labelledby="google-reviews-heading"
    >
      <h2
        id="google-reviews-heading"
        className="mb-6 text-center text-[28px] font-bold text-[#302A25] md:mb-8 md:text-[40px]"
      >
        {data.rating.toFixed(1)}★ Rated — See What They&apos;re Saying
      </h2>

      <div className="rounded-[8px] bg-[#F5F5F5] px-5 py-5 md:flex md:items-center md:justify-between md:px-6">
        <div>
          <div className="flex items-center gap-1.5">
            <GoogleWordmarkIcon
              className="h-[24px] w-[74px] shrink-0"
              aria-label="Google"
            />
            <span className="text-[17px] font-medium text-[#3F3F3F]">
              Rating
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[18px] font-semibold text-[#302A25]">
              {data.rating.toFixed(1)}
            </span>
            <Stars rating={data.rating} />
            <a
              href={data.googleMapsUri || GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#858585] hover:underline"
            >
              {data.totalReviews} reviews
            </a>
          </div>
        </div>

        <a
          href={GOOGLE_WRITE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[4px] bg-[#1A73E8] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1765CC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8] md:mt-0"
        >
          Write a review
        </a>
      </div>

      <div className="relative mt-4">
        <Swiper
          modules={[A11y]}
          onSwiper={setSwiper}
          slidesPerView={1.08}
          spaceBetween={12}
          loop={data.reviews.length > 4}
          loopAdditionalSlides={1}
          watchOverflow
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 14 },
            900: { slidesPerView: 3, spaceBetween: 14 },
            1180: { slidesPerView: 4, spaceBetween: 16 },
          }}
          className="w-full"
        >
          {data.reviews.map((review) => (
            <SwiperSlide key={review.id} className="h-auto">
              <ReviewCard review={review} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="mt-4 flex justify-center gap-2 md:mt-0">
          <button
            type="button"
            onClick={() => swiper?.slidePrev()}
            aria-label="Previous reviews"
            className="z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#302A25] text-white shadow-md transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 md:absolute md:top-1/2 md:-left-4 md:-translate-y-1/2"
            disabled={!swiper}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => swiper?.slideNext()}
            aria-label="Next reviews"
            className="z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#302A25] text-white shadow-md transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 md:absolute md:top-1/2 md:-right-4 md:-translate-y-1/2"
            disabled={!swiper}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsClient;
