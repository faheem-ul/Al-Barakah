import "server-only";

import { socialLog } from "@/lib/social/logger";
import { publishFacebookPost } from "./meta/facebook";
import { publishInstagramPost } from "./meta/instagram";
import {
  stageInstagramImages,
  storeSocialImages,
  storeSocialVideo,
  type SocialMediaFile,
} from "./media";
import { createSocialPost } from "./posts";
import type { PublishProgressReporter } from "./progress";
import type {
  CreateSocialPostInput,
  SocialMediaType,
  SocialPlatform,
  SocialPlatformResult,
  SocialPlatformResults,
  SocialPost,
} from "./types";

export type { SocialMediaFile, SocialMediaFile as SocialImageFile };

export type PublishSocialPostInput = CreateSocialPostInput & {
  images?: SocialMediaFile[];
  video?: SocialMediaFile;
};

export class SocialPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialPublishError";
  }
}

function stubResult(platform: "tiktok"): SocialPlatformResult {
  return {
    status: "not_implemented",
    error: "TikTok publishing comes later.",
  };
}

function summarizeStatus(platformResults: SocialPlatformResults) {
  const results = Object.values(platformResults);
  if (results.every((result) => result?.status === "published")) {
    return "published";
  }
  if (results.some((result) => result?.status === "published")) {
    return "partial";
  }
  return "failed";
}

function resolveMediaType(
  input: PublishSocialPostInput,
  mediaUrls: string[],
): SocialMediaType {
  if (input.mediaType === "video" || input.video) return "video";
  if (mediaUrls.length > 1) return "carousel";
  return input.mediaType ?? "image";
}

export async function publishSocialPost(
  input: PublishSocialPostInput,
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPost> {
  const onProgress = options?.onProgress;
  const startedAt = Date.now();
  const platformResults: SocialPlatformResults = {};
  let mediaUrls = input.mediaUrls ?? (input.mediaUrl ? [input.mediaUrl] : []);
  const isVideo = Boolean(input.video) || input.mediaType === "video";

  socialLog("info", "publish", "start", {
    platforms: input.platforms,
    imageCount: input.images?.length ?? 0,
    mediaUrlCount: mediaUrls.length,
    hasVideo: isVideo,
    createdBy: input.createdBy,
  });

  if (input.video && input.images && input.images.length > 0) {
    throw new SocialPublishError("Upload either one video or images, not both.");
  }

  if (mediaUrls.length === 0) {
    if (input.video) {
      const stored = await storeSocialVideo(input.video, { onProgress });
      if (!stored.ok) {
        throw new SocialPublishError(stored.error);
      }
      mediaUrls = [stored.url];
    } else if (input.images && input.images.length > 0) {
      const stored = await storeSocialImages(input.images, { onProgress });
      if (!stored.ok) {
        if (input.platforms.includes("instagram")) {
          throw new SocialPublishError(stored.error);
        }
        if (stored.urls.length === 0) {
          throw new SocialPublishError(stored.error);
        }
      }
      if (stored.urls.length > 0) {
        mediaUrls = stored.urls;
      }
    }
  }

  const needsMedia =
    input.platforms.includes("instagram") ||
    (isVideo && input.platforms.includes("facebook"));

  if (needsMedia && mediaUrls.length === 0) {
    throw new SocialPublishError(
      isVideo
        ? "A public video URL is required. Check your Cloudinary settings in .env.local."
        : "Instagram requires a public image URL. Check your Cloudinary settings in .env.local.",
    );
  }

  const mediaType = resolveMediaType(input, mediaUrls);

  let instagramMediaUrls = mediaUrls;
  let instagramStagingError: string | null = null;

  if (input.platforms.includes("instagram") && !isVideo) {
    const staged = await stageInstagramImages(mediaUrls);
    if (staged.ok) {
      instagramMediaUrls = staged.urls;
    } else {
      instagramStagingError = staged.error;
    }
  }

  for (const platform of input.platforms) {
    if (platform === "facebook") {
      platformResults.facebook = await publishFacebookPost(
        {
          caption: input.caption,
          mediaType,
          images: isVideo ? [] : (input.images ?? []),
          mediaUrls,
        },
        { onProgress },
      );
      continue;
    }

    if (platform === "instagram") {
      if (instagramStagingError) {
        socialLog("error", "instagram publish", "staging failed", {
          error: instagramStagingError,
        });
        onProgress?.({
          type: "progress",
          step: "instagram",
          status: "failed",
          error: instagramStagingError,
        });
        platformResults.instagram = {
          status: "failed",
          error: instagramStagingError,
        };
        continue;
      }

      platformResults.instagram = await publishInstagramPost(
        {
          caption: input.caption,
          mediaType,
          mediaUrls: instagramMediaUrls,
        },
        { onProgress },
      );
      continue;
    }

    platformResults[platform] = stubResult(platform);
  }

  const post = await createSocialPost(
    {
      caption: input.caption,
      mediaUrl: mediaUrls[0] ?? "",
      mediaUrls,
      mediaType,
      platforms: input.platforms,
      createdBy: input.createdBy,
    },
    platformResults,
  );

  socialLog("info", "publish", "complete", {
    durationMs: Date.now() - startedAt,
    status: summarizeStatus(platformResults),
    postId: post.id,
    mediaType,
    mediaCount: mediaUrls.length,
  });

  return post;
}
