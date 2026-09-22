import type { SocialPublishProgressEvent } from "@/lib/social/progress";

export type CloudinaryUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "video";
  uploadParams: Record<string, string | number>;
};

async function fetchUploadSignature(
  token: string,
  resourceType: "image" | "video",
): Promise<CloudinaryUploadSignature> {
  const response = await fetch("/api/social/upload-signature", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resourceType }),
  });

  const data = (await response.json().catch(() => null)) as
    | (CloudinaryUploadSignature & { error?: string })
    | null;

  if (!response.ok || !data?.cloudName) {
    throw new Error(data?.error || "Could not prepare Cloudinary upload.");
  }

  return data;
}

async function uploadFileToCloudinary(
  file: File,
  signature: CloudinaryUploadSignature,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);

  for (const [key, value] of Object.entries(signature.uploadParams)) {
    if (key === "timestamp" || key === "folder") continue;
    form.append(key, String(value));
  }

  const resourcePath =
    signature.resourceType === "video" ? "video/upload" : "image/upload";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourcePath}`,
    { method: "POST", body: form },
  );

  const data = (await response.json().catch(() => null)) as {
    secure_url?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !data?.secure_url) {
    throw new Error(
      data?.error?.message || "Cloudinary rejected the upload.",
    );
  }

  return data.secure_url;
}

export async function uploadImagesToCloudinary(input: {
  files: File[];
  token: string;
  onProgress?: (event: SocialPublishProgressEvent) => void;
}): Promise<string[]> {
  const { files, token, onProgress } = input;
  if (files.length === 0) return [];

  const urls: string[] = [];
  const total = files.length;

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "started",
    message: total > 1 ? "Uploading images to Cloudinary…" : "Uploading image to Cloudinary…",
    imageTotal: total > 1 ? total : undefined,
  });

  for (let index = 0; index < files.length; index += 1) {
    const imageIndex = index + 1;

    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "started",
      message:
        total > 1
          ? `Uploading to Cloudinary… ${imageIndex}/${total}`
          : "Uploading image to Cloudinary…",
      imageIndex: total > 1 ? imageIndex : undefined,
      imageTotal: total > 1 ? total : undefined,
    });

    const signature = await fetchUploadSignature(token, "image");
    const url = await uploadFileToCloudinary(files[index], signature);
    urls.push(url);

    onProgress?.({
      type: "progress",
      step: "cloudinary",
      status: "completed",
      message:
        total > 1
          ? `${imageIndex}/${total} images uploaded`
          : "Cloudinary: image uploaded",
      imageIndex: total > 1 ? imageIndex : undefined,
      imageTotal: total > 1 ? total : undefined,
    });
  }

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "completed",
    message:
      total > 1
        ? `${total}/${total} images uploaded`
        : "Cloudinary: image uploaded",
    imageIndex: total > 1 ? total : undefined,
    imageTotal: total > 1 ? total : undefined,
  });

  return urls;
}

export async function uploadVideoToCloudinary(input: {
  file: File;
  token: string;
  onProgress?: (event: SocialPublishProgressEvent) => void;
}): Promise<string> {
  const { file, token, onProgress } = input;

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "started",
    message: "Uploading video to Cloudinary…",
  });

  const signature = await fetchUploadSignature(token, "video");
  const url = await uploadFileToCloudinary(file, signature);

  onProgress?.({
    type: "progress",
    step: "cloudinary",
    status: "completed",
    message: "Cloudinary: video uploaded",
  });

  return url;
}
