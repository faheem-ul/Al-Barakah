"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { SocialPost } from "@/lib/social/types";

import { HISTORY_PAGE_SIZE } from "./constants";

type PostsPageResponse = {
  posts?: SocialPost[];
  nextCursor?: string | null;
  hasMore?: boolean;
  error?: string;
};

export function useSocialHistory(getToken: () => Promise<string | null>) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const cursorsRef = useRef<(string | null)[]>([null]);

  const fetchPage = useCallback(
    async (targetPage: number, cursor: string | null) => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setPosts([]);
          setHasMore(false);
          return;
        }

        const params = new URLSearchParams({
          limit: String(HISTORY_PAGE_SIZE),
        });
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/social/posts?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json().catch(() => null)) as
          | PostsPageResponse
          | null;

        if (!response.ok) {
          throw new Error(data?.error || "Could not load history.");
        }

        setPosts(data?.posts ?? []);
        setHasMore(Boolean(data?.hasMore));
        setPage(targetPage);

        if (data?.hasMore && data.nextCursor) {
          cursorsRef.current[targetPage] = data.nextCursor;
        }
      } catch (error) {
        console.error("Failed to load social posts", error);
        toast.error("Could not load publishing history.");
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  const refresh = useCallback(async () => {
    cursorsRef.current = [null];
    await fetchPage(1, null);
  }, [fetchPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const goNext = useCallback(async () => {
    if (!hasMore) return;
    const cursor = cursorsRef.current[page] ?? null;
    if (!cursor) return;
    await fetchPage(page + 1, cursor);
  }, [fetchPage, hasMore, page]);

  const goPrev = useCallback(async () => {
    if (page <= 1) return;
    const cursor = cursorsRef.current[page - 2] ?? null;
    await fetchPage(page - 1, cursor);
  }, [fetchPage, page]);

  const rangeStart = posts.length ? (page - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const rangeEnd = (page - 1) * HISTORY_PAGE_SIZE + posts.length;

  return {
    posts,
    loading,
    page,
    hasMore,
    goNext,
    goPrev,
    refresh,
    rangeStart,
    rangeEnd,
  };
}
