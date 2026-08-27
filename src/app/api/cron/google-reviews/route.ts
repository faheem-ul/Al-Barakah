import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  GOOGLE_REVIEWS_CACHE_TAG,
  logGoogleReviews,
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
    console.warn("[GoogleReviews] CRON | Unauthorized sync attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logGoogleReviews("CRON", "Scheduled sync triggered", {
    trigger: "cron",
  });

  try {
    const result = await syncGoogleReviews();

    if (result.status === "updated") {
      revalidateTag(GOOGLE_REVIEWS_CACHE_TAG);
      logGoogleReviews("CRON", "Next.js cache tag revalidated", {
        tag: GOOGLE_REVIEWS_CACHE_TAG,
      });
    } else {
      logGoogleReviews("CRON", "Next.js cache tag unchanged", {
        tag: GOOGLE_REVIEWS_CACHE_TAG,
        reason: "sync-skipped-firestore-still-fresh",
      });
    }

    logGoogleReviews("CRON", "Cron job finished", {
      syncStatus: result.status,
      placesApiCalled: result.status === "updated",
      reviewCount: result.snapshot.reviews.length,
      totalReviews: result.snapshot.totalReviews,
    });

    return NextResponse.json({
      status: result.status,
      reviewCount: result.snapshot.reviews.length,
      totalReviews: result.snapshot.totalReviews,
      fetchedAt: result.snapshot.fetchedAt,
      expiresAt: result.snapshot.expiresAt,
    });
  } catch (error) {
    console.error("[GoogleReviews] CRON | Sync failed — Firestore cache preserved", error);

    return NextResponse.json(
      { error: "Google reviews sync failed; the previous cache was preserved." },
      { status: 500 }
    );
  }
};
