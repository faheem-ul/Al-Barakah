import "server-only";

import { toInstagramVideoUrl } from "@/lib/social/media";
import { getInstagramPublisherEnv } from "@/lib/social/env";
import { socialLog } from "@/lib/social/logger";
import type { PublishProgressReporter } from "@/lib/social/progress";
import type { SocialMediaType, SocialPlatformResult } from "@/lib/social/types";

type GraphErrorBody = {
  error?: {
    message?: string;
    code?: number;
  };
  id?: string;
  status_code?: string;
  status?: string;
};

const INSTAGRAM_FETCH_TIMEOUT_MS = 120_000;
const INSTAGRAM_VIDEO_POLL_ATTEMPTS = 90;
const INSTAGRAM_VIDEO_POLL_DELAY_MS = 3_000;

function instagramUrl(path: string) {
  const { graphVersion } = getInstagramPublisherEnv();
  return `https://graph.instagram.com/${graphVersion}/${path}`;
}

function publicGraphError(body: GraphErrorBody, fallback: string) {
  const message = body.error?.message?.trim();
  if (!message) return fallback;
  return message.replace(/access_token=[^&\s]+/gi, "access_token=[redacted]");
}

function formatFetchError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const cause =
    error.cause instanceof Error
      ? error.cause.message
      : error.cause
        ? String(error.cause)
        : "";

  if (cause && cause !== error.message) {
    return `${error.message} (${cause})`;
  }

  return error.message || fallback;
}

async function instagramRequest<T extends GraphErrorBody>(
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { accessToken } = getInstagramPublisherEnv();
  const timeoutMs = options?.timeoutMs ?? INSTAGRAM_FETCH_TIMEOUT_MS;

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = (await response.json().catch(() => ({}))) as T;
    if (!response.ok || data.error) {
      return {
        ok: false,
        error: publicGraphError(data, "Instagram rejected the post."),
      };
    }

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: formatFetchError(error, "Could not reach Instagram."),
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMediaFetchError(error: string) {
  const lower = error.toLowerCase();
  return (
    lower.includes("only photo or video") ||
    lower.includes("could not be fetched") ||
    lower.includes("2207052")
  );
}

async function instagramRequestWithMediaRetry<T extends GraphErrorBody>(
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number; maxAttempts?: number },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const maxAttempts = options?.maxAttempts ?? 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await instagramRequest<T>(url, init, options);
    if (result.ok || !isMediaFetchError(result.error) || attempt === maxAttempts) {
      return result;
    }

    socialLog("warn", "instagram publish", "retry media container", {
      attempt,
      error: result.error,
    });
    await sleep(attempt * 2_000);
  }

  return { ok: false, error: "Instagram could not fetch the image." };
}

async function resolveInstagramUserId(): Promise<
  { ok: true; userId: string; username?: string } | { ok: false; error: string }
> {
  const { userId: configuredUserId } = getInstagramPublisherEnv();

  const me = await instagramRequest<{
    id?: string;
    user_id?: string;
    username?: string;
  }>(instagramUrl("me?fields=id,username,user_id"), { method: "GET" });

  if (!me.ok) {
    if (configuredUserId) {
      socialLog("warn", "instagram publish", "fallback user id", {
        configuredUserId,
      });
      return { ok: true, userId: configuredUserId };
    }

    return {
      ok: false,
      error: `${me.error} Use an Instagram Login token with instagram_business_basic and instagram_business_content_publish permissions.`,
    };
  }

  const userId = me.data.id || me.data.user_id || configuredUserId;
  if (!userId) {
    return {
      ok: false,
      error:
        "Could not resolve an Instagram user id from the access token. Regenerate your Instagram Login token.",
    };
  }

  if (configuredUserId && configuredUserId !== userId) {
    socialLog("warn", "instagram publish", "user id mismatch", {
      configuredUserId,
      tokenUserId: userId,
    });
  }

  return { ok: true, userId, username: me.data.username };
}

async function waitForContainer(
  containerId: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = options?.maxAttempts ?? 12;
  const delayMs = options?.delayMs ?? 1000;
  let consecutiveNetworkErrors = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await instagramRequest<GraphErrorBody>(
      instagramUrl(
        `${encodeURIComponent(containerId)}?fields=status_code,status`,
      ),
      { method: "GET" },
    );

    if (!result.ok) {
      consecutiveNetworkErrors += 1;
      socialLog("warn", "instagram publish", "container poll failed", {
        containerId,
        attempt: attempt + 1,
        error: result.error,
      });

      if (consecutiveNetworkErrors >= 5) {
        return {
          ok: false,
          error: `Instagram stopped responding while processing media: ${result.error}`,
        };
      }

      await sleep(delayMs);
      continue;
    }

    consecutiveNetworkErrors = 0;
    const status = result.data.status_code;
    socialLog("debug", "instagram publish", "container status", {
      containerId,
      status,
      detail: result.data.status,
      attempt: attempt + 1,
    });

    if (status === "FINISHED") return { ok: true };

    if (status === "ERROR") {
      return {
        ok: false,
        error:
          result.data.status?.trim() ||
          "Instagram could not process the video. Use MP4 (H.264), 3–90 seconds, and under 100MB.",
      };
    }

    await sleep(delayMs);
  }

  return {
    ok: false,
    error:
      "Instagram media processing timed out. Try a smaller MP4 video (under 100MB, 3–90 seconds).",
  };
}

async function publishReelToInstagram(
  userId: string,
  input: { caption: string; mediaUrl: string },
): Promise<
  { ok: true; postId: string } | { ok: false; error: string }
> {
  const videoUrl = toInstagramVideoUrl(input.mediaUrl);
  socialLog("info", "instagram publish", "reels container request", {
    videoHost: new URL(videoUrl).host,
  });

  const container = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: input.caption,
        share_to_feed: true,
      }),
    },
    { timeoutMs: INSTAGRAM_FETCH_TIMEOUT_MS },
  );

  if (!container.ok) {
    return { ok: false, error: container.error };
  }

  const containerId = container.data.id;
  if (!containerId) {
    return { ok: false, error: "Instagram did not return a Reels container id." };
  }

  socialLog("info", "instagram publish", "reels container created", {
    containerId,
  });

  const ready = await waitForContainer(containerId, {
    maxAttempts: INSTAGRAM_VIDEO_POLL_ATTEMPTS,
    delayMs: INSTAGRAM_VIDEO_POLL_DELAY_MS,
  });
  if (!ready.ok) {
    return { ok: false, error: ready.error };
  }

  const published = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media_publish`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId }),
    },
  );

  if (!published.ok) {
    return { ok: false, error: published.error };
  }

  const postId = published.data.id;
  if (!postId) {
    return { ok: false, error: "Instagram did not return a published Reels id." };
  }

  return { ok: true, postId };
}

async function publishSingleImageToInstagram(
  userId: string,
  input: { caption: string; mediaUrl: string },
): Promise<
  { ok: true; postId: string } | { ok: false; error: string }
> {
  const container = await instagramRequestWithMediaRetry<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "IMAGE",
        image_url: input.mediaUrl,
        caption: input.caption,
      }),
    },
  );

  if (!container.ok) {
    return { ok: false, error: container.error };
  }

  const containerId = container.data.id;
  if (!containerId) {
    return { ok: false, error: "Instagram did not return a media container id." };
  }

  socialLog("debug", "instagram publish", "container created", { containerId });

  const ready = await waitForContainer(containerId);
  if (!ready.ok) {
    return { ok: false, error: ready.error };
  }

  const published = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media_publish`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId }),
    },
  );

  if (!published.ok) {
    return { ok: false, error: published.error };
  }

  const postId = published.data.id;
  if (!postId) {
    return { ok: false, error: "Instagram did not return a published media id." };
  }

  return { ok: true, postId };
}

async function publishCarouselToInstagram(
  userId: string,
  input: { caption: string; mediaUrls: string[] },
): Promise<
  { ok: true; postId: string } | { ok: false; error: string }
> {
  const childIds: string[] = [];

  for (const [index, mediaUrl] of input.mediaUrls.entries()) {
    const child = await instagramRequestWithMediaRetry<{ id?: string }>(
      instagramUrl(`${encodeURIComponent(userId)}/media`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "IMAGE",
          image_url: mediaUrl,
          is_carousel_item: true,
        }),
      },
    );

    if (!child.ok) {
      return {
        ok: false,
        error: child.error || `Failed on carousel image ${index + 1}.`,
      };
    }

    const childId = child.data.id;
    if (!childId) {
      return {
        ok: false,
        error: `Instagram did not return a container id for image ${index + 1}.`,
      };
    }

    socialLog("debug", "instagram carousel", "child created", {
      childId,
      index: index + 1,
    });

    const ready = await waitForContainer(childId);
    if (!ready.ok) {
      return {
        ok: false,
        error: ready.error || `Instagram carousel image ${index + 1} was not ready.`,
      };
    }

    childIds.push(childId);

    if (index < input.mediaUrls.length - 1) {
      await sleep(1_500);
    }
  }

  const carousel = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: input.caption,
      }),
    },
  );

  if (!carousel.ok) {
    return { ok: false, error: carousel.error };
  }

  const carouselId = carousel.data.id;
  if (!carouselId) {
    return { ok: false, error: "Instagram did not return a carousel container id." };
  }

  socialLog("debug", "instagram carousel", "parent created", { carouselId });

  const parentReady = await waitForContainer(carouselId);
  if (!parentReady.ok) {
    return {
      ok: false,
      error: parentReady.error || "Instagram carousel container was not ready to publish.",
    };
  }

  const published = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media_publish`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: carouselId }),
    },
  );

  if (!published.ok) {
    return { ok: false, error: published.error };
  }

  const postId = published.data.id;
  if (!postId) {
    return { ok: false, error: "Instagram did not return a published media id." };
  }

  return { ok: true, postId };
}

export async function publishInstagramPost(
  input: {
    caption: string;
    mediaType?: SocialMediaType;
    mediaUrls: string[];
  },
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPlatformResult> {
  const onProgress = options?.onProgress;
  const { accessToken } = getInstagramPublisherEnv();
  if (!accessToken) {
    return {
      status: "failed",
      error: "Instagram is not configured on the server.",
    };
  }

  if (input.mediaUrls.length === 0) {
    return {
      status: "failed",
      error:
        input.mediaType === "video"
          ? "Instagram requires a public video URL. Upload a video and check Cloudinary settings."
          : "Instagram requires a public image URL. Upload an image and check Cloudinary settings.",
    };
  }

  if (input.mediaType === "video" && input.mediaUrls.length > 1) {
    return {
      status: "failed",
      error: "Instagram supports one video per post.",
    };
  }

  const startedAt = Date.now();
  onProgress?.({
    type: "progress",
    step: "instagram",
    status: "started",
    message:
      input.mediaType === "video"
        ? "Publishing Reel to Instagram (this may take a few minutes)…"
        : "Publishing to Instagram",
  });

  const resolved = await resolveInstagramUserId();
  if (!resolved.ok) {
    const durationMs = Date.now() - startedAt;
    onProgress?.({
      type: "progress",
      step: "instagram",
      status: "failed",
      error: resolved.error,
      durationMs,
    });
    return { status: "failed", error: resolved.error };
  }

  const { userId, username } = resolved;
  const isVideo = input.mediaType === "video";
  socialLog("info", "instagram publish", "start", {
    userId,
    username,
    imageCount: input.mediaUrls.length,
    carousel: !isVideo && input.mediaUrls.length > 1,
    isVideo,
  });

  const result = isVideo
    ? await publishReelToInstagram(userId, {
        caption: input.caption,
        mediaUrl: input.mediaUrls[0],
      })
    : input.mediaUrls.length > 1
      ? await publishCarouselToInstagram(userId, input)
      : await publishSingleImageToInstagram(userId, {
          caption: input.caption,
          mediaUrl: input.mediaUrls[0],
        });

  const durationMs = Date.now() - startedAt;

  if (!result.ok) {
    socialLog("error", "instagram publish", "failed", {
      durationMs,
      error: result.error,
    });
    onProgress?.({
      type: "progress",
      step: "instagram",
      status: "failed",
      error: result.error,
      durationMs,
    });
    return { status: "failed", error: result.error };
  }

  socialLog("info", "instagram publish", "done", {
    durationMs,
    postId: result.postId,
  });
  onProgress?.({
    type: "progress",
    step: "instagram",
    status: "completed",
    message: isVideo ? "Published Reel to Instagram" : "Published to Instagram",
    postId: result.postId,
    durationMs,
  });

  return { status: "published", postId: result.postId };
}

/** @deprecated Use publishInstagramPost */
export async function publishToInstagram(
  input: { caption: string; mediaUrl: string },
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPlatformResult> {
  return publishInstagramPost(
    { caption: input.caption, mediaUrls: input.mediaUrl ? [input.mediaUrl] : [] },
    options,
  );
}
