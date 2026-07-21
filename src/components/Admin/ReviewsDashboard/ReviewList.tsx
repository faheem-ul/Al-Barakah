"use client";

import React from "react";

import Text from "@/components/ui/Text";
import Spinner from "@/components/ui/Spinner";
import { Review } from "@/lib/reviews";
import ReviewCard from "./ReviewCard";

type ReviewListProps = {
  loading: boolean;
  reviews: Review[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
};

const ReviewList: React.FC<ReviewListProps> = ({
  loading,
  reviews,
  busyId,
  onApprove,
  onReject,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner fill="#000000" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white border border-black/10 rounded-lg p-8 text-center">
        <Text className="text-[14px] text-[#6B6B6B]">
          No reviews in this filter.
        </Text>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          busy={busyId === r.id}
          onApprove={() => onApprove(r.id)}
          onReject={() => onReject(r.id)}
          onDelete={() => onDelete(r.id)}
        />
      ))}
    </ul>
  );
};

export default ReviewList;
