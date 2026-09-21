import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv } from "@/lib/social/env";
import { redactUrlHost, socialLog } from "@/lib/social/logger";
import type { PublishProgressReporter } from "@/lib/social/progress";

export type SocialImageFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

function safeFilename(name: string) {
  const base = name.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
  return (base || "image").slice(0, 80);
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
  image: SocialImageFile,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!configureCloudinary()) {
    return {
      ok: false,
      error:
        "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local.",
    };
  }

  const { folder } = getCloudinaryEnv();
  const publicId = `${Date.now()}-${safeFilename(image.filename).replace(/\.[^.]+$/, "")}`;

  try {
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "image",
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

        stream.end(image.buffer);
      },
    );

    return { ok: true, url: result.secure_url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary upload failed.";
    return { ok: false, error: message };
  }
}

export type StoreSocialImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function storeSocialImage(
  image: SocialImageFile,
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
  });

  const uploaded = await uploadBufferToCloudinary(image);
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

export type StoreSocialImagesResult =
  | { ok: true; urls: string[] }
  | { ok: false; error: string; urls: string[] };

export async function storeSocialImages(
  images: SocialImageFile[],
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

    const uploaded = await uploadBufferToCloudinary(image);
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
