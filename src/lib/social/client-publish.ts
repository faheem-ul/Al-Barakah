import type { SocialPlatform, SocialPost } from "@/lib/social/types";

import type {
  SocialPublishProgressEvent,
  SocialPublishStep,
  SocialPublishStreamEvent,
} from "./progress";

type SocialPublishPlatform = Extract<SocialPlatform, SocialPublishStep>;

export type PublishWithProgressResult =
  | { ok: true; post: SocialPost }
  | { ok: false; error: string; post?: SocialPost };

function parseStreamLine(line: string): SocialPublishStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as SocialPublishStreamEvent;
  } catch {
    return null;
  }
}

function replayProgressFromPost(
  post: SocialPost,
  onProgress?: (event: SocialPublishProgressEvent) => void,
) {
  const mediaUrls =
    post.mediaUrls?.length > 0
      ? post.mediaUrls
      : post.mediaUrl
        ? [post.mediaUrl]
        : [];

  if (mediaUrls.length > 1) {
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "completed",
      message: `${mediaUrls.length}/${mediaUrls.length} images uploaded`,
      imageIndex: mediaUrls.length,
      imageTotal: mediaUrls.length,
    });
  } else if (mediaUrls.length === 1) {
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "completed",
      message: "Cloudinary: image uploaded",
    });
  }

  const platformSteps: SocialPublishPlatform[] = ["facebook", "instagram"];
  for (const step of platformSteps) {
    const result = post.platformResults[step];
    if (!result) continue;

    onProgress?.({
      type: "progress",
      step,
      status: result.status === "published" ? "completed" : "failed",
      error: result.error,
      postId: result.postId,
    });
  }
}

async function readPublishStream(
  response: Response,
  onProgress?: (event: SocialPublishProgressEvent) => void,
): Promise<PublishWithProgressResult> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/x-ndjson")) {
    const data = (await response.json().catch(() => null)) as {
      post?: SocialPost;
      error?: string;
    } | null;

    if (!response.ok || !data?.post) {
      return {
        ok: false,
        error: data?.error || "Could not publish the post.",
      };
    }

    replayProgressFromPost(data.post, onProgress);
    return { ok: true, post: data.post };
  }

  if (!response.body) {
    return { ok: false, error: "Publish stream was empty." };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let post: SocialPost | undefined;
  let streamError = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseStreamLine(line);
      if (!event) continue;

      if (event.type === "progress") {
        onProgress?.(event);
        continue;
      }

      if (event.type === "complete") {
        post = event.post;
        continue;
      }

      if (event.type === "error") {
        streamError = event.error;
      }
    }
  }

  if (buffer.trim()) {
    const event = parseStreamLine(buffer);
    if (event?.type === "complete") post = event.post;
    if (event?.type === "error") streamError = event.error;
    if (event?.type === "progress") onProgress?.(event);
  }

  if (post) {
    return { ok: true, post };
  }

  return {
    ok: false,
    error: streamError || "Could not publish the post.",
  };
}

export async function publishWithProgress(input: {
  formData: FormData;
  token: string;
  onProgress?: (event: SocialPublishProgressEvent) => void;
}): Promise<PublishWithProgressResult> {
  input.formData.set("socialProgress", "1");

  const response = await fetch("/api/social/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "X-Social-Progress": "1",
    },
    body: input.formData,
  });

  return readPublishStream(response, input.onProgress);
}
