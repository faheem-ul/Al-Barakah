import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  GOOGLE_REVIEWS_CACHE_TAG,
  syncGoogleReviews,
} from "@/lib/google-reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isAuthorizedCronRequest = (request: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
};

export const GET = async (request: NextRequest) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGoogleReviews();

    if (result.status === "updated") {
      revalidateTag(GOOGLE_REVIEWS_CACHE_TAG);
    }

    return NextResponse.json({
      status: result.status,
      reviewCount: result.snapshot.reviews.length,
      fetchedAt: result.snapshot.fetchedAt,
      expiresAt: result.snapshot.expiresAt,
    });
  } catch (error) {
    console.error("Google reviews sync failed", error);

    return NextResponse.json(
      { error: "Google reviews sync failed; the previous cache was preserved." },
      { status: 500 }
    );
  }
};
