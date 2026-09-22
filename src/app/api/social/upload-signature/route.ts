import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCloudinaryEnv } from "@/lib/social/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResourceType = "image" | "video";

function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
  if (!cloudName || !apiKey || !apiSecret) return null;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret, folder: getCloudinaryEnv().folder };
}

function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
) {
  return cloudinary.utils.api_sign_request(params, apiSecret);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const config = configureCloudinary();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }

  let resourceType: ResourceType = "image";
  try {
    const body = (await request.json()) as { resourceType?: string };
    if (body.resourceType === "video") resourceType = "video";
  } catch {
    // default image
  }

  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = {
    timestamp,
    folder: config.folder,
  };

  if (resourceType === "image") {
    params.format = "jpg";
  } else {
    params.format = "mp4";
  }

  const signature = signParams(params, config.apiSecret);

  return NextResponse.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder: config.folder,
    resourceType,
    uploadParams: params,
  });
}
