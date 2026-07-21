"use client";

import React from "react";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { Review } from "@/lib/reviews";
import { productLabel, statusBadgeClass } from "./constants";

type ReviewCardProps = {
  review: Review;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  review: r,
  busy,
  onApprove,
  onReject,
  onDelete,
}) => {
  const initial = (r.name?.[0] || "A").toUpperCase();

  return (
    <li className="rounded-lg border border-black/8 bg-white p-5 shadow-sm flex flex-col gap-4">
      <span className="inline-block max-w-full self-start text-[12px] font-medium text-[#4A4A4A] bg-[#F2EEE6] px-2.5 py-1 rounded-md line-clamp-2">
        {productLabel(r)}
      </span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#302A25] text-white flex items-center justify-center text-[15px] font-semibold">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Text className="text-[16px] font-semibold capitalize text-black leading-tight">
                {r.name || "Anonymous"}
              </Text>
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full capitalize",
                  statusBadgeClass[r.status],
                )}
              >
                {r.status}
              </span>
            </div>
            <Text className="text-[13px] text-[#6B6B6B] mt-0.5 truncate">
              {r.email}
            </Text>
            <Text className="text-[12px] text-[#8A8A8A] mt-1.5">
              {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 pl-[52px] sm:pl-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={
                s <= (r.rating || 0)
                  ? "text-yellow-400 text-[18px]"
                  : "text-gray-300 text-[18px]"
              }
            >
              ★
            </span>
          ))}
          <span className="ml-1.5 text-[12px] text-[#6B6B6B] font-medium">
            {r.rating}/5
          </span>
        </div>
      </div>

      <div className="pl-0 sm:pl-[52px]">
        <Text className="text-[15px] text-black whitespace-pre-wrap leading-relaxed line-clamp-5">
          {r.message}
        </Text>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-3 border-t border-black/8 sm:pl-[52px]">
        {r.status !== "approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-medium rounded-full bg-[#302A25] text-white hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            Approve
          </button>
        )}
        {r.status !== "rejected" && (
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-medium rounded-full bg-[#F2EEE6] text-[#302A25] border border-[#302A25]/20 hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            Reject
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-medium rounded-full border border-[#302A25]/25 text-[#302A25] bg-white hover:bg-[#F2EEE6] disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </li>
  );
};

export default ReviewCard;
