"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Text from "@/components/ui/Text";
import type { SocialPost } from "@/lib/social/types";

import PostStatusBadge from "./PostStatusBadge";

type PublishingHistoryProps = {
  posts: SocialPost[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  rangeStart: number;
  rangeEnd: number;
  onPrev: () => void;
  onNext: () => void;
};

function getPostMediaUrls(post: SocialPost) {
  if (post.mediaUrls?.length > 0) return post.mediaUrls;
  return post.mediaUrl ? [post.mediaUrl] : [];
}

function truncateError(text: string, max = 48) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const PublishingHistory: React.FC<PublishingHistoryProps> = ({
  posts,
  loading,
  page,
  hasMore,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
}) => {
  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
      <Text className="text-[16px] font-semibold text-black mb-1">
        Publishing history
      </Text>

      {loading ? (
        <Text className="text-[13px] text-[#6B6B6B] mt-2">Loading…</Text>
      ) : posts.length === 0 ? (
        <Text className="text-[13px] text-[#6B6B6B] mt-2">
          No posts yet. Published posts will appear here.
        </Text>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-[#6B6B6B]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Caption</th>
                  <th className="py-2 pr-3 font-semibold">Facebook</th>
                  <th className="py-2 font-semibold">Instagram</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const mediaUrls = getPostMediaUrls(post);
                  const extraCount = mediaUrls.length - 1;
                  const fb = post.platformResults.facebook;
                  const ig = post.platformResults.instagram;

                  return (
                    <tr key={post.id} className="border-b border-black/5">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-[#6B6B6B]">
                        {new Date(post.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-black max-w-[240px]">
                        <div className="flex items-center gap-2 min-w-0">
                          {mediaUrls[0] ? (
                            <div className="relative shrink-0">
                              {post.mediaType === "video" ? (
                                <video
                                  src={mediaUrls[0]}
                                  className="size-10 rounded object-cover border border-black/10 bg-black"
                                  muted
                                  playsInline
                                />
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={mediaUrls[0]}
                                  alt=""
                                  className="size-10 rounded object-cover border border-black/10"
                                />
                              )}
                              {extraCount > 0 ? (
                                <span className="absolute -bottom-1 -right-1 rounded bg-black px-1 py-0.5 text-[10px] text-white">
                                  +{extraCount}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <span className="truncate">
                            {post.caption ||
                              (post.mediaType === "video" ? "(video)" : "(image)")}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="space-y-1">
                          <PostStatusBadge status={fb?.status} />
                          {fb?.warning ? (
                            <p
                              className="text-[12px] text-[#b54708] truncate max-w-[160px]"
                              title={fb.warning}
                            >
                              {truncateError(fb.warning)}
                            </p>
                          ) : null}
                          {fb?.error ? (
                            <p
                              className="text-[12px] text-[#b42318] truncate max-w-[160px]"
                              title={fb.error}
                            >
                              {truncateError(fb.error)}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="space-y-1">
                          <PostStatusBadge status={ig?.status} />
                          {ig?.error ? (
                            <p
                              className="text-[12px] text-[#b42318] truncate max-w-[160px]"
                              title={ig.error}
                            >
                              {truncateError(ig.error)}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6b7280]">
              {rangeStart > 0
                ? `Showing ${rangeStart}–${rangeEnd}`
                : "No posts on this page"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-[72px] text-center text-[13px] text-[#374151]">
                Page {page}
              </span>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasMore || loading}
                aria-label="Next page"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#e5e7eb] text-[#374151] transition-opacity hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default PublishingHistory;
