import "server-only";

import { getMetaPublisherEnv } from "@/lib/social/env";
import { SOCIAL_FACEBOOK_MAX_PHOTOS } from "@/lib/social/limits";
import { socialLog } from "@/lib/social/logger";
import type { PublishProgressReporter } from "@/lib/social/progress";
import type { SocialPlatformResult } from "@/lib/social/types";

type FacebookImage = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
  id?: string;
  post_id?: string;
};

function graphUrl(pageId: string, edge: "photos" | "feed") {
  const { graphVersion } = getMetaPublisherEnv();
  return `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/${edge}`;
}

function publicGraphError(body: GraphErrorBody, fallback: string) {
  const message = body.error?.message?.trim();
  if (!message) return fallback;
  return message.replace(/access_token=[^&\s]+/gi, "access_token=[redacted]");
}

async function graphRequest(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; id: string; postId?: string } | { ok: false; error: string }> {
  const { pageAccessToken } = getMetaPublisherEnv();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${pageAccessToken}`,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as GraphErrorBody;
  if (!response.ok || body.error) {
    return {
      ok: false,
      error: publicGraphError(body, "Facebook rejected the post."),
    };
  }

  const id = body.id;
  const postId = body.post_id;
  if (!id && !postId) {
    return { ok: false, error: "Facebook did not return a post id." };
  }

  return { ok: true, id: id || postId || "", postId };
}

async function uploadUnpublishedPhoto(input: {
  pageId: string;
  image?: FacebookImage;
  mediaUrl?: string;
}): Promise<{ ok: true; photoId: string } | { ok: false; error: string }> {
  if (input.mediaUrl) {
    const form = new FormData();
    form.set("url", input.mediaUrl);
    form.set("published", "false");

    const result = await graphRequest(graphUrl(input.pageId, "photos"), {
      method: "POST",
      body: form,
    });

    if (!result.ok) return result;
    return { ok: true, photoId: result.id };
  }

  if (!input.image) {
    return { ok: false, error: "Facebook photo upload requires an image." };
  }

  const form = new FormData();
  form.set("published", "false");
  form.set(
    "source",
    new File([new Uint8Array(input.image.buffer)], input.image.filename, {
      type: input.image.mimeType,
    }),
  );

  const result = await graphRequest(graphUrl(input.pageId, "photos"), {
    method: "POST",
    body: form,
  });

  if (!result.ok) return result;
  return { ok: true, photoId: result.id };
}

async function publishMultiPhotoToFacebook(
  pageId: string,
  input: {
    caption: string;
    images: FacebookImage[];
    mediaUrls: string[];
  },
): Promise<
  | { ok: true; postId: string; warning?: string }
  | { ok: false; error: string }
> {
  const totalSelected = Math.max(input.images.length, input.mediaUrls.length);
  const warning =
    totalSelected > SOCIAL_FACEBOOK_MAX_PHOTOS
      ? `Facebook only supports ${SOCIAL_FACEBOOK_MAX_PHOTOS} photos; used the first ${SOCIAL_FACEBOOK_MAX_PHOTOS}.`
      : undefined;

  const count = Math.min(
    SOCIAL_FACEBOOK_MAX_PHOTOS,
    Math.max(input.images.length, input.mediaUrls.length),
  );
  const photoIds: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const uploaded = await uploadUnpublishedPhoto({
      pageId,
      image: input.images[index],
      mediaUrl: input.mediaUrls[index],
    });

    if (!uploaded.ok) {
      return {
        ok: false,
        error: uploaded.error || `Failed on Facebook photo ${index + 1}.`,
      };
    }

    photoIds.push(uploaded.photoId);
  }

  const form = new FormData();
  form.set("message", input.caption);
  photoIds.forEach((photoId, index) => {
    form.set(
      `attached_media[${index}]`,
      JSON.stringify({ media_fbid: photoId }),
    );
  });

  const published = await graphRequest(graphUrl(pageId, "feed"), {
    method: "POST",
    body: form,
  });

  if (!published.ok) return published;

  return {
    ok: true,
    postId: published.postId || published.id,
    warning,
  };
}

export async function publishFacebookPost(
  input: {
    caption: string;
    images?: FacebookImage[];
    mediaUrls?: string[];
  },
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPlatformResult> {
  const onProgress = options?.onProgress;
  const { pageId, pageAccessToken } = getMetaPublisherEnv();
  if (!pageId || !pageAccessToken) {
    return {
      status: "failed",
      error: "Facebook Page is not configured on the server.",
    };
  }

  const images = input.images ?? [];
  const mediaUrls = input.mediaUrls ?? [];
  const imageCount = Math.max(images.length, mediaUrls.length);

  const startedAt = Date.now();
  onProgress?.({
    type: "progress",
    step: "facebook",
    status: "started",
    message: "Publishing to Facebook",
  });
  socialLog("info", "facebook publish", "start", {
    pageId,
    imageCount,
    multiPhoto: imageCount > 1,
  });

  try {
    let result:
      | { ok: true; postId: string; warning?: string }
      | { ok: false; error: string };

    if (imageCount > 1) {
      result = await publishMultiPhotoToFacebook(pageId, {
        caption: input.caption,
        images,
        mediaUrls,
      });
    } else if (imageCount === 1) {
      const form = new FormData();
      form.set("caption", input.caption);
      form.set("published", "true");

      if (images[0]) {
        form.set(
          "source",
          new File([new Uint8Array(images[0].buffer)], images[0].filename, {
            type: images[0].mimeType,
          }),
        );
      } else if (mediaUrls[0]) {
        form.set("url", mediaUrls[0]);
      }

      const single = await graphRequest(graphUrl(pageId, "photos"), {
        method: "POST",
        body: form,
      });

      result = single.ok
        ? { ok: true, postId: single.postId || single.id }
        : single;
    } else {
      const textOnly = await graphRequest(graphUrl(pageId, "feed"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.caption }),
      });

      result = textOnly.ok
        ? { ok: true, postId: textOnly.postId || textOnly.id }
        : textOnly;
    }

    const durationMs = Date.now() - startedAt;

    if (!result.ok) {
      socialLog("error", "facebook publish", "failed", {
        durationMs,
        error: result.error,
      });
      onProgress?.({
        type: "progress",
        step: "facebook",
        status: "failed",
        error: result.error,
        durationMs,
      });
      return { status: "failed", error: result.error };
    }

    socialLog("info", "facebook publish", "done", {
      durationMs,
      postId: result.postId,
      warning: result.warning,
    });
    onProgress?.({
      type: "progress",
      step: "facebook",
      status: "completed",
      message: result.warning || "Published to Facebook",
      postId: result.postId,
      durationMs,
    });

    return {
      status: "published",
      postId: result.postId,
      ...(result.warning ? { warning: result.warning } : {}),
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    socialLog("error", "facebook publish", "failed", {
      durationMs,
      error: error instanceof Error ? error.message : "unknown",
    });
    onProgress?.({
      type: "progress",
      step: "facebook",
      status: "failed",
      error: "Could not reach Facebook.",
      durationMs,
    });
    return { status: "failed", error: "Could not reach Facebook." };
  }
}

/** @deprecated Use publishFacebookPost */
export async function publishToFacebook(
  input: { caption: string; image?: FacebookImage },
  options?: { onProgress?: PublishProgressReporter },
): Promise<SocialPlatformResult> {
  return publishFacebookPost(
    {
      caption: input.caption,
      images: input.image ? [input.image] : [],
      mediaUrls: [],
    },
    options,
  );
}
