import Image from "next/image";
import { FcGoogle } from "react-icons/fc";

import type { GoogleReview } from "@/lib/google-reviews";
import { RatingStarIcon } from "@/ui/Icons";

import { GOOGLE_REVIEWS_URL } from "../constants";

// Stars props type
type StarsProps = {
  rating: number;
  small?: boolean;
};

// Review card stars component
export const Stars = ({ rating, small = false }: StarsProps) => (
  <div
    className="flex items-center gap-0.5"
    aria-label={`${rating} out of 5 stars`}
  >
    {Array.from({ length: 5 }, (_, index) => (
      <RatingStarIcon
        key={index}
        aria-hidden="true"
        color={index < Math.round(rating) ? "#F6C854" : "#D6D6D6"}
        className={small ? "h-4 w-4" : "h-[18px] w-[19px]"}
      />
    ))}
  </div>
);

// Avatar colors
const avatarColors = ["#16877C", "#718A95", "#9B3FB0", "#C17B36", "#3F6FA8"];

// Get avatar color
const getAvatarColor = (name: string) => {
  const colorIndex = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return avatarColors[colorIndex % avatarColors.length];
};

// Review card props type
type ReviewCardProps = {
  review: GoogleReview;
};

// Review card component
const ReviewCard = ({ review }: ReviewCardProps) => (
  <article className="flex h-full min-h-[250px] flex-col rounded-[8px] bg-[#F5F5F5] p-5">
    <div className="flex items-center gap-3">
      <a
        href={review.authorUri || review.googleMapsUri}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
        aria-label={`View ${review.authorName}'s Google Maps profile`}
      >
        {review.authorPhotoUri ? (
          <Image
            src={review.authorPhotoUri}
            alt={`${review.authorName}'s profile`}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-[17px] font-medium text-white"
            style={{ backgroundColor: getAvatarColor(review.authorName) }}
            aria-hidden="true"
          >
            {review.authorName.charAt(0).toUpperCase()}
          </span>
        )}
      </a>
      <div className="min-w-0">
        <a
          href={review.authorUri || review.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[14px] font-semibold text-[#302A25] hover:underline"
        >
          {review.authorName}
        </a>
        <p className="text-[11px] text-[#858585]">
          {review.relativePublishTimeDescription}
        </p>
      </div>
    </div>

    <div className="mt-3">
      <Stars rating={review.rating} small />
    </div>

    {review.text && (
      <div className="mt-3">
        <p className="line-clamp-3 text-[13px] leading-[1.55] text-[#3F3F3F]">
          {review.text}
        </p>
        {review.text.length > 120 && (
          <a
            href={review.googleMapsUri || GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[12px] font-medium text-[#4285F4] hover:underline"
          >
            Read more
          </a>
        )}
      </div>
    )}

    <a
      href={review.googleMapsUri || GOOGLE_REVIEWS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-auto flex w-fit items-center gap-2 pt-4 text-[11px] text-[#858585] transition-opacity hover:opacity-75"
      aria-label={`View ${review.authorName}'s review on Google Maps`}
    >
      <FcGoogle className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>
        Posted on
        <span className="block text-[#4285F4]" translate="no">
          Google
        </span>
      </span>
    </a>
  </article>
);

export default ReviewCard;
