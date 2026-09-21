import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";

import type {
  CreateSocialPostInput,
  SocialMediaType,
  SocialPlatform,
  SocialPlatformResults,
  SocialPost,
  SocialPostStatus,
} from "./types";

const COLLECTION = "social-posts";

function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeForFirestore(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, sanitizeForFirestore(entry)] as const);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

function isPlatform(value: unknown): value is SocialPlatform {
  return value === "facebook" || value === "instagram" || value === "tiktok";
}

function resolveMediaType(
  value: unknown,
  mediaUrls: string[],
): SocialMediaType {
  if (value === "video") return "video";
  if (value === "carousel" || mediaUrls.length > 1) return "carousel";
  return "image";
}

function mapPost(id: string, data: Partial<SocialPost>): SocialPost {
  const platforms = Array.isArray(data.platforms)
    ? data.platforms.filter(isPlatform)
    : [];

  const mediaUrl = String(data.mediaUrl ?? "");
  const mediaUrls =
    Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0
      ? data.mediaUrls.map(String)
      : mediaUrl
        ? [mediaUrl]
        : [];

  return {
    id,
    caption: String(data.caption ?? ""),
    mediaUrl: mediaUrls[0] ?? mediaUrl,
    mediaUrls,
    mediaType: resolveMediaType(data.mediaType, mediaUrls),
    platforms,
    status:
      data.status === "partial" ||
      data.status === "published" ||
      data.status === "failed" ||
      data.status === "pending"
        ? data.status
        : "pending",
    platformResults: data.platformResults ?? {},
    createdBy: String(data.createdBy ?? ""),
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
}

export function overallStatus(
  platforms: SocialPlatform[],
  results: SocialPlatformResults,
): SocialPostStatus {
  const statuses = platforms.map(
    (platform) => results[platform]?.status ?? "pending",
  );
  const published = statuses.filter((status) => status === "published").length;
  const blocked = statuses.filter(
    (status) => status === "failed" || status === "not_implemented",
  ).length;

  if (published === platforms.length) return "published";
  if (published > 0) return "partial";
  if (blocked === platforms.length) return "failed";
  return "pending";
}

export async function createSocialPost(
  input: CreateSocialPostInput,
  results: SocialPlatformResults,
): Promise<SocialPost> {
  const now = Date.now();
  const mediaUrls =
    input.mediaUrls && input.mediaUrls.length > 0
      ? input.mediaUrls
      : input.mediaUrl
        ? [input.mediaUrl]
        : [];
  const mediaType =
    input.mediaType ??
    (mediaUrls.length > 1 ? "carousel" : "image");

  const payload: Omit<SocialPost, "id"> = {
    caption: input.caption,
    mediaUrl: mediaUrls[0] ?? "",
    mediaUrls,
    mediaType,
    platforms: input.platforms,
    status: overallStatus(input.platforms, results),
    platformResults: results,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await getAdminDb()
      .collection(COLLECTION)
      .add(sanitizeForFirestore(payload));
    return { id: ref.id, ...payload };
  } catch (error) {
    console.error("[social/posts] Failed to save publish history", error);
    throw error;
  }
}

export async function listSocialPosts(limit = 25): Promise<SocialPost[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) =>
    mapPost(doc.id, doc.data() as Partial<SocialPost>),
  );
}
