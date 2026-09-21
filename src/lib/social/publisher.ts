import "server-only";

import { socialLog } from "@/lib/social/logger";
import { publishFacebookPost } from "./meta/facebook";
import { publishInstagramPost } from "./meta/instagram";
import { storeSocialImages, type SocialImageFile } from "./media";
import { createSocialPost } from "./posts";
import type { PublishProgressReporter } from "./progress";
import type {
  CreateSocialPostInput,
  SocialPlatform,
  SocialPlatformResult,
  SocialPlatformResults,
  SocialPost,
} from "./types";

export type { SocialImageFile };

export type PublishSocialPostInput = CreateSocialPostInput & {
  images?: SocialImageFile[];
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

export async function publishSocialPost(
  input: PublishSocialPostInput,
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPost> {
  const onProgress = options?.onProgress;
  const startedAt = Date.now();
  const platformResults: SocialPlatformResults = {};
  let mediaUrls = input.mediaUrls ?? (input.mediaUrl ? [input.mediaUrl] : []);

  socialLog("info", "publish", "start", {
    platforms: input.platforms,
    imageCount: input.images?.length ?? 0,
    createdBy: input.createdBy,
  });

  if (input.images && input.images.length > 0) {
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

  if (input.platforms.includes("instagram") && mediaUrls.length === 0) {
    throw new SocialPublishError(
      "Instagram requires a public image URL. Check your Cloudinary settings in .env.local.",
    );
  }

  const mediaType = mediaUrls.length > 1 ? "carousel" : input.mediaType ?? "image";

  for (const platform of input.platforms) {
    if (platform === "facebook") {
      platformResults.facebook = await publishFacebookPost(
        {
          caption: input.caption,
          images: input.images ?? [],
          mediaUrls,
        },
        { onProgress },
      );
      continue;
    }

    if (platform === "instagram") {
      platformResults.instagram = await publishInstagramPost(
        {
          caption: input.caption,
          mediaUrls,
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
    imageCount: mediaUrls.length,
  });

  return post;
}
