import "server-only";

import { randomUUID } from "crypto";

import { v2 as cloudinary } from "cloudinary";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCloudinaryEnv } from "@/lib/social/env";
import { redactUrlHost, socialLog } from "@/lib/social/logger";
import type { PublishProgressReporter } from "@/lib/social/progress";

export const SOCIAL_TEMP_MEDIA_COLLECTION = "social-media-temp";

const TEMP_MEDIA_TTL_MS = 24 * 60 * 60 * 1000;

export type SocialMediaFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

/** @deprecated Use SocialMediaFile */
export type SocialImageFile = SocialMediaFile;

function safeFilename(name: string, fallback = "media") {
  const base = name.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
  return (base || fallback).slice(0, 80);
}

function configureCloudinary() {
  const env = getCloudinaryEnv();
  if (!env.cloudName || !env.apiKey || !env.apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: env.cloudName,
    api_key: env.apiKey,
    api_secret: env.apiSecret,
    secure: true,
  });

  return true;
}

async function uploadBufferToCloudinary(
  file: SocialMediaFile,
  resourceType: "image" | "video",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!configureCloudinary()) {
    return {
      ok: false,
      error:
        "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local.",
    };
  }

  const { folder } = getCloudinaryEnv();
  const fallback = resourceType === "video" ? "video" : "image";
  const publicId = `${Date.now()}-${safeFilename(file.filename, fallback).replace(/\.[^.]+$/, "")}`;

  try {
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: resourceType,
            ...(resourceType === "video"
              ? { format: "mp4", video_codec: "h264" }
              : {}),
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
              return;
            }
            if (!uploadResult?.secure_url) {
              reject(new Error("Cloudinary did not return a public URL."));
              return;
            }
            resolve(uploadResult);
          },
        );

        stream.end(file.buffer);
      },
    );

    const url =
      resourceType === "video"
        ? toInstagramVideoUrl(result.secure_url)
        : result.secure_url;

    return { ok: true, url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary upload failed.";
    return { ok: false, error: message };
  }
}

/** H.264 MP4 delivery URL for Meta video/Reels ingestion. */
export function toInstagramVideoUrl(url: string): string {
  if (!url.includes("/video/upload/")) return url;
  if (url.includes("/f_mp4/") || url.includes(",f_mp4/")) return url;
  return url.replace("/video/upload/", "/video/upload/f_mp4/");
}

/** Instagram accepts JPEG only, max width 1440. */
const INSTAGRAM_IMAGE_TRANSFORMS = "f_jpg,q_auto:good,c_limit,w_1440";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isJpegBuffer(buffer: Buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

export function toInstagramImageUrl(url: string): string {
  const marker = "/image/upload/";
  if (!url.includes(marker)) return url;

  const withTransforms = `${marker}${INSTAGRAM_IMAGE_TRANSFORMS}/`;
  if (url.includes(withTransforms)) return url;

  if (url.includes(`${marker}f_jpg`)) {
    return url.replace(/\/image\/upload\/[^/]+\//, withTransforms);
  }

  return url.replace(marker, withTransforms);
}

async function fetchCloudinaryJpeg(sourceUrl: string, maxAttempts = 5) {
  let lastError = "Cloudinary did not return a ready JPEG image.";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
        headers: { Accept: "image/jpeg,image/*,*/*" },
      });

      if (!response.ok) {
        lastError = `Cloudinary returned HTTP ${response.status} while preparing the image.`;
        await sleep(Math.min(attempt * 700, 3_000));
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (!isJpegBuffer(buffer)) {
        lastError = "Cloudinary did not return a valid JPEG for Instagram.";
        await sleep(Math.min(attempt * 700, 3_000));
        continue;
      }

      return buffer;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : lastError;
      await sleep(Math.min(attempt * 700, 3_000));
    }
  }

  throw new Error(lastError);
}

async function prewarmPublicMediaUrl(url: string, maxAttempts = 4) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Accept: "image/jpeg,image/*,*/*",
          "User-Agent": "facebookexternalhit/1.1",
        },
      });

      lastStatus = response.status;
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (isJpegBuffer(buffer)) return;
      }
    } catch {
      // retry below
    }

    await sleep(attempt * 1_000);
  }

  throw new Error(
    `Instagram image URL is not publicly reachable (HTTP ${lastStatus || "network error"}). Set SOCIAL_PUBLIC_BASE_URL to your live HTTPS domain (recommended) or a working ngrok URL, then restart the dev server.`,
  );
}

/** Public HTTPS origin Meta can fetch. Live domain in prod, ngrok in dev. */
export function getSocialPublicBaseUrl() {
  const raw =
    process.env.SOCIAL_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "";
  return raw.replace(/\/+$/, "");
}

function isUnreachableByMeta(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:") return true;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

export type StageInstagramImagesResult =
  | { ok: true; urls: string[] }
  | { ok: false; error: string };

/**
 * Meta's media fetcher rejects many CDN hosts (including Cloudinary) with
 * error 9004. Re-serve the images from our own domain instead, converting to
 * JPEG via Cloudinary since Instagram only accepts JPEG.
 */
export async function stageInstagramImages(
  cloudinaryUrls: string[],
): Promise<StageInstagramImagesResult> {
  const baseUrl = getSocialPublicBaseUrl();

  if (!baseUrl || isUnreachableByMeta(baseUrl)) {
    return {
      ok: false,
      error:
        "Instagram needs a public HTTPS address to download images from. Set SOCIAL_PUBLIC_BASE_URL in .env.local to your live site URL (or an ngrok https URL for local testing) and restart the dev server.",
    };
  }

  if (cloudinaryUrls.length === 0) {
    return { ok: false, error: "No uploaded images to publish." };
  }

  const db = getAdminDb();
  const batch = db.batch();
  const expiresAt = Date.now() + TEMP_MEDIA_TTL_MS;
  const urls: string[] = [];

  for (const [index, cloudinaryUrl] of cloudinaryUrls.entries()) {
    const sourceUrl = toInstagramImageUrl(cloudinaryUrl);

    try {
      await fetchCloudinaryJpeg(sourceUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image preparation failed.";
      return {
        ok: false,
        error: `Image ${index + 1}/${cloudinaryUrls.length}: ${message}`,
      };
    }

    const id = randomUUID();
    batch.set(db.collection(SOCIAL_TEMP_MEDIA_COLLECTION).doc(id), {
      sourceUrl,
      mimeType: "image/jpeg",
      expiresAt,
    });
    urls.push(`${baseUrl}/api/social/media/${id}.jpg`);
  }

  await batch.commit();

  for (const [index, publicUrl] of urls.entries()) {
    try {
      await prewarmPublicMediaUrl(publicUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Public image URL is not ready.";
      return {
        ok: false,
        error: `Image ${index + 1}/${urls.length}: ${message}`,
      };
    }
  }

  socialLog("info", "instagram media", "staged images", {
    count: urls.length,
    baseHost: new URL(baseUrl).host,
  });

  return { ok: true, urls };
}

export type StoreSocialImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function storeSocialImage(
  image: SocialMediaFile,
  options?: { onProgress?: PublishProgressReporter },
): Promise<StoreSocialImageResult> {
  const onProgress = options?.onProgress;
  const startedAt = Date.now();

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "started",
    message: "Uploading image to Cloudinary…",
  });
  socialLog("info", "cloudinary upload", "start", {
    bytes: image.buffer.byteLength,
    filename: image.filename,
    resourceType: "image",
  });

  const uploaded = await uploadBufferToCloudinary(image, "image");
  const durationMs = Date.now() - startedAt;

  if (!uploaded.ok) {
    socialLog("error", "cloudinary upload", "failed", {
      durationMs,
      error: uploaded.error,
    });
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "failed",
      error: uploaded.error,
      durationMs,
    });
    return uploaded;
  }

  socialLog("info", "cloudinary upload", "done", {
    durationMs,
    host: redactUrlHost(uploaded.url),
  });
  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "completed",
    message: "Cloudinary: image uploaded",
    durationMs,
  });

  return uploaded;
}

export async function storeSocialVideo(
  video: SocialMediaFile,
  options?: { onProgress?: PublishProgressReporter },
): Promise<StoreSocialImageResult> {
  const onProgress = options?.onProgress;
  const startedAt = Date.now();

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "started",
    message: "Uploading video to Cloudinary…",
  });
  socialLog("info", "cloudinary upload", "start", {
    bytes: video.buffer.byteLength,
    filename: video.filename,
    resourceType: "video",
  });

  const uploaded = await uploadBufferToCloudinary(video, "video");
  const durationMs = Date.now() - startedAt;

  if (!uploaded.ok) {
    socialLog("error", "cloudinary upload", "failed", {
      durationMs,
      error: uploaded.error,
    });
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "failed",
      error: uploaded.error,
      durationMs,
    });
    return uploaded;
  }

  socialLog("info", "cloudinary upload", "done", {
    durationMs,
    host: redactUrlHost(uploaded.url),
    resourceType: "video",
  });
  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "completed",
    message: "Cloudinary: video uploaded",
    durationMs,
  });

  return uploaded;
}

export type StoreSocialImagesResult =
  | { ok: true; urls: string[] }
  | { ok: false; error: string; urls: string[] };

export async function storeSocialImages(
  images: SocialMediaFile[],
  options?: { onProgress?: PublishProgressReporter },
): Promise<StoreSocialImagesResult> {
  if (images.length === 0) {
    return { ok: true, urls: [] };
  }

  if (images.length === 1) {
    const single = await storeSocialImage(images[0], options);
    if (!single.ok) {
      return { ok: false, error: single.error, urls: [] };
    }
    return { ok: true, urls: [single.url] };
  }

  const onProgress = options?.onProgress;
  const total = images.length;
  const urls: string[] = [];
  const batchStartedAt = Date.now();

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "started",
    message: "Uploading images to Cloudinary…",
    imageTotal: total,
  });
  socialLog("info", "cloudinary batch", "start", { total });

  if (!configureCloudinary()) {
    const error =
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local.";
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "failed",
      error,
      imageTotal: total,
    });
    return { ok: false, error, urls: [] };
  }

  for (let index = 0; index < images.length; index += 1) {
    const imageIndex = index + 1;
    const image = images[index];
    const startedAt = Date.now();

    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "started",
      message: `Uploading to Cloudinary… ${imageIndex}/${total}`,
      imageIndex,
      imageTotal: total,
    });
    socialLog("info", "cloudinary upload", "start", {
      index: imageIndex,
      total,
      filename: image.filename,
    });

    const uploaded = await uploadBufferToCloudinary(image, "image");
    const durationMs = Date.now() - startedAt;

    if (!uploaded.ok) {
      socialLog("error", "cloudinary upload", "failed", {
        index: imageIndex,
        total,
        durationMs,
        error: uploaded.error,
      });
      onProgress?.({
        type: "progress",
        step: "cloudinary",
        status: "failed",
        message: `Failed on image ${imageIndex}/${total}`,
        error: uploaded.error,
        imageIndex,
        imageTotal: total,
        durationMs,
      });
      return { ok: false, error: uploaded.error, urls };
    }

    urls.push(uploaded.url);
    socialLog("info", "cloudinary upload", "done", {
      index: imageIndex,
      total,
      durationMs,
      host: redactUrlHost(uploaded.url),
    });
    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "completed",
      message: `${imageIndex}/${total} images uploaded`,
      imageIndex,
      imageTotal: total,
      durationMs,
    });
  }

  socialLog("info", "cloudinary batch", "done", {
    total,
    durationMs: Date.now() - batchStartedAt,
  });
  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "completed",
    message: `${total}/${total} images uploaded`,
    imageIndex: total,
    imageTotal: total,
    durationMs: Date.now() - batchStartedAt,
  });

  return { ok: true, urls };
}
