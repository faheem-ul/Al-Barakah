import "server-only";

import { getInstagramPublisherEnv } from "@/lib/social/env";
import { socialLog } from "@/lib/social/logger";
import type { PublishProgressReporter } from "@/lib/social/progress";
import type { SocialPlatformResult } from "@/lib/social/types";

type GraphErrorBody = {
  error?: {
    message?: string;
    code?: number;
  };
  id?: string;
  status_code?: string;
};

function instagramUrl(path: string) {
  const { graphVersion } = getInstagramPublisherEnv();
  return `https://graph.instagram.com/${graphVersion}/${path}`;
}

function publicGraphError(body: GraphErrorBody, fallback: string) {
  const message = body.error?.message?.trim();
  if (!message) return fallback;
  return message.replace(/access_token=[^&\s]+/gi, "access_token=[redacted]");
}

async function instagramRequest<T extends GraphErrorBody>(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { accessToken } = getInstagramPublisherEnv();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok || data.error) {
    return {
      ok: false,
      error: publicGraphError(data, "Instagram rejected the post."),
    };
  }

  return { ok: true, data };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForContainer(containerId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await instagramRequest<GraphErrorBody>(
      instagramUrl(`${encodeURIComponent(containerId)}?fields=status_code`),
      { method: "GET" },
    );

    if (!result.ok) return false;

    const status = result.data.status_code;
    socialLog("debug", "instagram publish", "container status", {
      containerId,
      status,
      attempt: attempt + 1,
    });
    if (status === "FINISHED") return true;
    if (status === "ERROR") return false;

    await sleep(1000);
  }

  return false;
}

async function publishSingleImageToInstagram(
  userId: string,
  input: { caption: string; mediaUrl: string },
): Promise<
  { ok: true; postId: string } | { ok: false; error: string }
> {
  const container = await instagramRequest<{ id?: string }>(
    instagramUrl(`${encodeURIComponent(userId)}/media`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
  if (!ready) {
    return {
      ok: false,
      error: "Instagram media container was not ready to publish.",
    };
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
    const child = await instagramRequest<{ id?: string }>(
      instagramUrl(`${encodeURIComponent(userId)}/media`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    if (!ready) {
      return {
        ok: false,
        error: `Instagram carousel image ${index + 1} was not ready.`,
      };
    }

    childIds.push(childId);
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
  if (!parentReady) {
    return {
      ok: false,
      error: "Instagram carousel container was not ready to publish.",
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
        "Instagram requires a public image URL. Upload an image and check Cloudinary settings.",
    };
  }

  const startedAt = Date.now();
  onProgress?.({
    type: "progress",
    step: "instagram",
    status: "started",
    message: "Publishing to Instagram",
  });

  try {
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
    socialLog("info", "instagram publish", "start", {
      userId,
      username,
      imageCount: input.mediaUrls.length,
      carousel: input.mediaUrls.length > 1,
    });

    const result =
      input.mediaUrls.length > 1
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
      message: "Published to Instagram",
      postId: result.postId,
      durationMs,
    });

    return { status: "published", postId: result.postId };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    socialLog("error", "instagram publish", "failed", {
      durationMs,
      error: error instanceof Error ? error.message : "unknown",
    });
    onProgress?.({
      type: "progress",
      step: "instagram",
      status: "failed",
      error: "Could not reach Instagram.",
      durationMs,
    });
    return { status: "failed", error: "Could not reach Instagram." };
  }
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
