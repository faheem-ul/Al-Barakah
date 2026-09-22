import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import type { VerifiedAdmin } from "@/lib/firebase/verify-id-token";
import { socialLog } from "@/lib/social/logger";
import {
  ALLOWED_VIDEO_MIME_TYPES,
  SOCIAL_MAX_IMAGES,
  SOCIAL_MAX_VIDEO_BYTES,
} from "@/lib/social/limits";
import {
  serializePublishEvent,
  type SocialPublishStreamEvent,
} from "@/lib/social/progress";
import {
  publishSocialPost,
  SocialPublishError,
  type PublishSocialPostInput,
  type SocialMediaFile,
} from "@/lib/social/publisher";
import type { SocialMediaType, SocialPlatform } from "@/lib/social/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_PLATFORMS: SocialPlatform[] = ["facebook", "instagram"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

function isPlatform(value: unknown): value is SocialPlatform {
  return value === "facebook" || value === "instagram" || value === "tiktok";
}

function parsePlatforms(value: unknown): SocialPlatform[] {
  if (Array.isArray(value)) return value.filter(isPlatform);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter(isPlatform);
    } catch {
      return isPlatform(value) ? [value] : [];
    }
  }
  return [];
}

function wantsProgressStream(
  request: NextRequest,
  progressFlag?: string | null,
) {
  return (
    request.headers.get("x-social-progress") === "1" || progressFlag === "1"
  );
}

function isCloudinaryMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      (url.pathname.includes("/image/upload/") ||
        url.pathname.includes("/video/upload/"))
    );
  } catch {
    return false;
  }
}

function parseMediaType(value: unknown): SocialMediaType | undefined {
  if (value === "image" || value === "video" || value === "carousel") {
    return value;
  }
  return undefined;
}

function parseMediaUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter((entry) => isCloudinaryMediaUrl(entry));
}

async function parseImageFile(file: File): Promise<
  | { ok: true; image: SocialMediaFile }
  | { ok: false; response: NextResponse }
> {
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Each image must be 8MB or smaller." },
        { status: 400 },
      ),
    };
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Use JPG, PNG, GIF, WEBP, or BMP images only." },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    image: {
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || "image.jpg",
      mimeType,
    },
  };
}

async function parseVideoFile(file: File): Promise<
  | { ok: true; video: SocialMediaFile }
  | { ok: false; response: NextResponse }
> {
  if (file.size > SOCIAL_MAX_VIDEO_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Video must be 100MB or smaller." },
        { status: 400 },
      ),
    };
  }

  const mimeType = file.type || "video/mp4";
  if (!ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Use MP4 or MOV video only." },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    video: {
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || "video.mp4",
      mimeType,
    },
  };
}

type ParsedPublishRequest =
  | {
      ok: true;
      input: PublishSocialPostInput;
      streamProgress: boolean;
    }
  | { ok: false; response: NextResponse };

async function parsePublishRequest(
  request: NextRequest,
  admin: VerifiedAdmin,
): Promise<ParsedPublishRequest> {
  const contentType = request.headers.get("content-type") || "";
  let caption = "";
  let platforms: SocialPlatform[] = [];
  let images: SocialMediaFile[] = [];
  let video: SocialMediaFile | undefined;
  let formProgress: string | null = null;
  let mediaUrls: string[] = [];
  let mediaType: SocialMediaType | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      formProgress = String(form.get("socialProgress") || "").trim() || null;
      caption = String(form.get("caption") || "").trim();
      platforms = parsePlatforms(form.get("platforms"));

      const videoEntry = form.get("video");
      if (videoEntry instanceof File && videoEntry.size > 0) {
        const parsedVideo = await parseVideoFile(videoEntry);
        if (!parsedVideo.ok) return parsedVideo;
        video = parsedVideo.video;
      }

      const files = [
        ...form.getAll("images"),
        ...(form.get("image") ? [form.get("image")] : []),
      ].filter((entry): entry is File => entry instanceof File && entry.size > 0);

      if (video && files.length > 0) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Upload either one video or images, not both." },
            { status: 400 },
          ),
        };
      }

      if (files.length > SOCIAL_MAX_IMAGES) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: `You can upload up to ${SOCIAL_MAX_IMAGES} images.` },
            { status: 400 },
          ),
        };
      }

      for (const file of files) {
        const parsed = await parseImageFile(file);
        if (!parsed.ok) return parsed;
        images.push(parsed.image);
      }
    } else {
      const body = (await request.json()) as {
        caption?: string;
        platforms?: unknown;
        mediaUrls?: unknown;
        mediaType?: unknown;
        socialProgress?: string;
      };
      formProgress = String(body.socialProgress || "").trim() || null;
      caption = String(body.caption || "").trim();
      platforms = parsePlatforms(body.platforms);
      mediaUrls = parseMediaUrls(body.mediaUrls);
      mediaType = parseMediaType(body.mediaType);

      if (Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0) {
        if (mediaUrls.length !== body.mediaUrls.length) {
          return {
            ok: false,
            response: NextResponse.json(
              { error: "Media URLs must be HTTPS Cloudinary links." },
              { status: 400 },
            ),
          };
        }

        if (mediaUrls.length > SOCIAL_MAX_IMAGES) {
          return {
            ok: false,
            response: NextResponse.json(
              { error: `You can upload up to ${SOCIAL_MAX_IMAGES} images.` },
              { status: 400 },
            ),
          };
        }
      }
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      ),
    };
  }

  const hasMedia = images.length > 0 || Boolean(video) || mediaUrls.length > 0;

  if (!caption && !hasMedia) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Add a caption or media." },
        { status: 400 },
      ),
    };
  }

  if (platforms.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Select at least one platform." },
        { status: 400 },
      ),
    };
  }

  const unsupported = platforms.filter(
    (platform) => !ALLOWED_PLATFORMS.includes(platform),
  );
  if (unsupported.length > 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${unsupported.join(", ")} is not available yet.` },
        { status: 400 },
      ),
    };
  }

  if (platforms.includes("instagram") && !hasMedia) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Instagram requires an image or video." },
        { status: 400 },
      ),
    };
  }

  const mediaCount = Math.max(images.length, mediaUrls.length, video ? 1 : 0);
  const resolvedMediaType =
    mediaType ??
    (video || mediaUrls.some((url) => url.includes("/video/upload/"))
      ? "video"
      : mediaCount > 1
        ? "carousel"
        : "image");

  return {
    ok: true,
    input: {
      caption,
      mediaType: resolvedMediaType,
      platforms,
      createdBy: admin.email || admin.uid,
      images: images.length > 0 ? images : undefined,
      video,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    },
    streamProgress: wantsProgressStream(request, formProgress),
  };
}

function createProgressResponse(input: PublishSocialPostInput) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: SocialPublishStreamEvent) => {
        controller.enqueue(encoder.encode(serializePublishEvent(event)));
      };

      try {
        const post = await publishSocialPost(input, {
          onProgress: write,
        });
        write({ type: "complete", post });
      } catch (error) {
        const message =
          error instanceof SocialPublishError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Could not publish the post.";
        socialLog("error", "publish", "failed", {
          error: message,
          name: error instanceof Error ? error.name : "unknown",
        });
        console.error("[social/publish] Stream publish failed", error);
        write({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parsePublishRequest(request, auth.admin);
  if (!parsed.ok) return parsed.response;

  socialLog("info", "publish request", "accepted", {
    platforms: parsed.input.platforms,
    imageCount: parsed.input.images?.length ?? 0,
    hasVideo: Boolean(parsed.input.video),
    admin: auth.admin.email || auth.admin.uid,
    streaming: parsed.streamProgress,
  });

  if (parsed.streamProgress) {
    return createProgressResponse(parsed.input);
  }

  try {
    const post = await publishSocialPost(parsed.input);
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof SocialPublishError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    socialLog("error", "publish", "failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Could not publish the post." },
      { status: 500 },
    );
  }
}
