import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getAdminDb } from "@/lib/firebase/admin";

export const GOOGLE_REVIEWS_CACHE_TAG = "google-reviews";
/** Firestore + Next.js cache TTL — reviews refresh after 2 days. */
const GOOGLE_REVIEWS_CACHE_TTL_DAYS = 2;
export const GOOGLE_REVIEWS_CACHE_TTL_SECONDS =
  GOOGLE_REVIEWS_CACHE_TTL_DAYS * 24 * 60 * 60;
export const GOOGLE_REVIEWS_CACHE_TTL_MS =
  GOOGLE_REVIEWS_CACHE_TTL_SECONDS * 1000;

const GOOGLE_REVIEWS_COLLECTION = "googlereviews";
const GOOGLE_REVIEWS_DOCUMENT = "cache";
const LOG_PREFIX = "[GoogleReviews]";

type SnapshotLogMeta = {
  placeName: string;
  rating: number;
  totalReviews: number;
  reviewCount: number;
  fetchedAt: string;
  expiresAt: string;
  cacheAge: string;
  ttlRemaining: string;
  isExpired: boolean;
};

const formatDuration = (ms: number) => {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
};

const formatSnapshotMeta = (
  snapshot: GoogleReviewsSnapshot,
  now = Date.now()
): SnapshotLogMeta => ({
  placeName: snapshot.placeName,
  rating: snapshot.rating,
  totalReviews: snapshot.totalReviews,
  reviewCount: snapshot.reviews.length,
  fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
  expiresAt: new Date(snapshot.expiresAt).toISOString(),
  cacheAge: formatDuration(Math.max(0, now - snapshot.fetchedAt)),
  ttlRemaining: formatDuration(Math.max(0, snapshot.expiresAt - now)),
  isExpired: snapshot.expiresAt <= now,
});

export const logGoogleReviews = (
  channel: "SYNC" | "READ" | "API" | "CRON",
  message: string,
  meta?: Record<string, unknown>
) => {
  if (meta && Object.keys(meta).length > 0) {
    console.info(`${LOG_PREFIX} ${channel} | ${message}`, meta);
    return;
  }
  console.info(`${LOG_PREFIX} ${channel} | ${message}`);
};

/** Set true when unstable_cache misses and reads Firestore (per request). */
let firestoreReadOnCacheMiss = false;
const GOOGLE_PLACES_FIELD_MASK = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "reviews",
].join(",");

// Google review type
export type GoogleReview = {
  id: string;
  authorName: string;
  authorUri: string;
  authorPhotoUri: string | null;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  publishTime: string;
  googleMapsUri: string;
  flagContentUri: string | null;
};

// Google reviews snapshot type
export type GoogleReviewsSnapshot = {
  source: "google-places-new";
  placeId: string;
  placeName: string;
  rating: number;
  totalReviews: number;
  googleMapsUri: string;
  reviews: GoogleReview[];
  fetchedAt: number;
  expiresAt: number;
};

// Google localized text type
type GoogleLocalizedText = {
  text?: string;
};

// Google author attribution type
type GoogleAuthorAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

// Google places review type
type GooglePlacesReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: GoogleLocalizedText;
  rating?: number;
  authorAttribution?: GoogleAuthorAttribution;
  publishTime?: string;
  googleMapsUri?: string;
  flagContentUri?: string;
};

// Google place details response type
type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: GoogleLocalizedText;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GooglePlacesReview[];
};

// Google reviews sync result type
export type GoogleReviewsSyncResult =
  | { status: "updated"; snapshot: GoogleReviewsSnapshot }
  | { status: "skipped"; snapshot: GoogleReviewsSnapshot };

const requiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

// Parse the Google place details
export const parseGooglePlaceDetails = (
  place: GooglePlaceDetailsResponse,
  fetchedAt = Date.now()
): GoogleReviewsSnapshot => {
  const placeId = asString(place.id);

  if (!placeId) {
    throw new Error("Google Places response did not include a place ID");
  }

  const placeMapsUri = asString(place.googleMapsUri);
  const reviews = (place.reviews ?? []).slice(0, 5).map((review, index) => {
    const authorName = asString(
      review.authorAttribution?.displayName,
      "Google user"
    );

    return {
      id: asString(review.name, `${placeId}-review-${index}`),
      authorName,
      authorUri: asString(review.authorAttribution?.uri, placeMapsUri),
      authorPhotoUri: review.authorAttribution?.photoUri ?? null,
      rating: Math.min(5, Math.max(0, asNumber(review.rating))),
      text: asString(review.text?.text),
      relativePublishTimeDescription: asString(
        review.relativePublishTimeDescription
      ),
      publishTime: asString(review.publishTime),
      googleMapsUri: asString(review.googleMapsUri, placeMapsUri),
      flagContentUri: review.flagContentUri ?? null,
    };
  });

  return {
    source: "google-places-new",
    placeId,
    placeName: asString(place.displayName?.text, "Albaraka Honey"),
    rating: Math.min(5, Math.max(0, asNumber(place.rating))),
    totalReviews: Math.max(0, Math.round(asNumber(place.userRatingCount))),
    googleMapsUri: placeMapsUri,
    reviews,
    fetchedAt,
    expiresAt: fetchedAt + GOOGLE_REVIEWS_CACHE_TTL_MS,
  };
};

const isGoogleReview = (value: unknown): value is GoogleReview => {
  if (!value || typeof value !== "object") return false;

  const review = value as Partial<GoogleReview>;
  return (
    typeof review.id === "string" &&
    typeof review.authorName === "string" &&
    typeof review.rating === "number" &&
    typeof review.text === "string"
  );
};

// Check if the value is a Google reviews snapshot
export const isGoogleReviewsSnapshot = (
  value: unknown
): value is GoogleReviewsSnapshot => {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<GoogleReviewsSnapshot>;
  return (
    snapshot.source === "google-places-new" &&
    typeof snapshot.placeId === "string" &&
    typeof snapshot.placeName === "string" &&
    typeof snapshot.rating === "number" &&
    typeof snapshot.totalReviews === "number" &&
    typeof snapshot.googleMapsUri === "string" &&
    typeof snapshot.fetchedAt === "number" &&
    typeof snapshot.expiresAt === "number" &&
    Array.isArray(snapshot.reviews) &&
    snapshot.reviews.every(isGoogleReview)
  );
};

// Check if the Google reviews snapshot is fresh
export const isGoogleReviewsSnapshotFresh = (
  snapshot: GoogleReviewsSnapshot,
  now = Date.now()
) => snapshot.expiresAt > now;

// Get the snapshot document
const getSnapshotDocument = () =>
  getAdminDb().collection(GOOGLE_REVIEWS_COLLECTION).doc(GOOGLE_REVIEWS_DOCUMENT);

// Fetch the Google place details
export const fetchGooglePlaceDetails = async (
  placeId = requiredEnv("GOOGLE_PLACE_ID")
) => {
  const endpoint = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
  );
  endpoint.searchParams.set("languageCode", "en");
  endpoint.searchParams.set("regionCode", "PK");

  const startedAt = Date.now();
  logGoogleReviews("API", "Calling Google Places API (Place Details)", {
    placeId,
    method: "GET",
    fields: GOOGLE_PLACES_FIELD_MASK,
  });

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      "X-Goog-Api-Key": requiredEnv("GOOGLE_PLACES_API_KEY"),
      "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
    },
  });

  if (!response.ok) {
    const responseBody = await response.text();
    logGoogleReviews("API", "Google Places API failed", {
      placeId,
      status: response.status,
      durationMs: Date.now() - startedAt,
      error: responseBody.slice(0, 300),
    });
    throw new Error(
      `Google Places request failed (${response.status}): ${responseBody.slice(
        0,
        500
      )}`
    );
  }

  const place = (await response.json()) as GooglePlaceDetailsResponse;

  logGoogleReviews("API", "Google Places API succeeded", {
    placeId,
    durationMs: Date.now() - startedAt,
    placeName: place.displayName?.text ?? "unknown",
    rating: place.rating ?? null,
    totalReviews: place.userRatingCount ?? null,
    reviewsReturned: place.reviews?.length ?? 0,
  });

  return place;
};

// Sync the Google reviews
export const syncGoogleReviews = async (
  now = Date.now()
): Promise<GoogleReviewsSyncResult> => {
  logGoogleReviews("SYNC", "Sync started", {
    ttlDays: GOOGLE_REVIEWS_CACHE_TTL_DAYS,
    firestorePath: `${GOOGLE_REVIEWS_COLLECTION}/${GOOGLE_REVIEWS_DOCUMENT}`,
  });

  const document = getSnapshotDocument();
  const existingDocument = await document.get();
  const existingData = existingDocument.data();

  const hasValidCache = isGoogleReviewsSnapshot(existingData);
  const cacheIsFresh =
    hasValidCache && isGoogleReviewsSnapshotFresh(existingData, now);

  if (hasValidCache) {
    logGoogleReviews("SYNC", "Firestore read complete", {
      ...formatSnapshotMeta(existingData, now),
      cacheStatus: cacheIsFresh ? "fresh" : "stale",
    });
  } else {
    logGoogleReviews("SYNC", "Firestore read complete — no valid cached snapshot", {
      documentExists: existingDocument.exists,
    });
  }

  if (cacheIsFresh) {
    logGoogleReviews("SYNC", "Places API skipped — Firestore cache is still fresh", {
      reason: "cache-fresh",
      placesApiCalled: false,
    });
    logGoogleReviews("SYNC", "Sync finished", {
      status: "skipped",
      dataSource: "firestore",
      placesApiCalled: false,
      ...formatSnapshotMeta(existingData, now),
    });
    return { status: "skipped", snapshot: existingData };
  }

  logGoogleReviews("SYNC", "Firestore cache stale or missing — calling Places API", {
    placesApiCalled: true,
  });

  const place = await fetchGooglePlaceDetails();
  const snapshot = parseGooglePlaceDetails(place, now);

  await document.set(snapshot);

  logGoogleReviews("SYNC", "Firestore write complete", {
    ...formatSnapshotMeta(snapshot, now),
  });

  logGoogleReviews("SYNC", "Sync finished", {
    status: "updated",
    dataSource: "google-places-api → firestore",
    placesApiCalled: true,
    ...formatSnapshotMeta(snapshot, now),
  });

  return { status: "updated", snapshot };
};

// Read the Google reviews snapshot from the cache
const readGoogleReviewsSnapshot = unstable_cache(
  async (): Promise<GoogleReviewsSnapshot | null> => {
    firestoreReadOnCacheMiss = true;

    logGoogleReviews("READ", "Next.js cache MISS — reading Firestore", {
      layer: "next-unstable-cache",
      firestorePath: `${GOOGLE_REVIEWS_COLLECTION}/${GOOGLE_REVIEWS_DOCUMENT}`,
      revalidateSeconds: GOOGLE_REVIEWS_CACHE_TTL_SECONDS,
    });

    const document = await getSnapshotDocument().get();
    const data = document.data();

    if (isGoogleReviewsSnapshot(data)) {
      logGoogleReviews("READ", "Firestore document loaded", {
        layer: "firestore",
        ...formatSnapshotMeta(data),
      });
      return data;
    }

    logGoogleReviews("READ", "Firestore document missing or invalid", {
      layer: "firestore",
      documentExists: document.exists,
    });
    return null;
  },
  ["google-reviews-snapshot"],
  {
    revalidate: GOOGLE_REVIEWS_CACHE_TTL_SECONDS,
    tags: [GOOGLE_REVIEWS_CACHE_TAG],
  }
);

// Get the Google reviews snapshot from the cache (deduped per request)
export const getGoogleReviewsSnapshot = cache(
  async (): Promise<GoogleReviewsSnapshot | null> => {
    firestoreReadOnCacheMiss = false;

    logGoogleReviews("READ", "Page request started", {
      flow: "getGoogleReviewsSnapshot",
    });

    const hasFirebaseAdminConfig = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ].every((name) => Boolean(process.env[name]));

    if (!hasFirebaseAdminConfig) {
      logGoogleReviews("READ", "Request finished — using UI fallback", {
        dataSource: "fallback",
        reason: "firebase-admin-env-missing",
        placesApiCalled: false,
        firestoreRead: false,
        nextCacheHit: false,
      });
      return null;
    }

    try {
      const snapshot = await readGoogleReviewsSnapshot();

      if (!firestoreReadOnCacheMiss && snapshot) {
        logGoogleReviews("READ", "Next.js cache HIT — serving cached snapshot", {
          layer: "next-unstable-cache",
          revalidateSeconds: GOOGLE_REVIEWS_CACHE_TTL_SECONDS,
          ...formatSnapshotMeta(snapshot),
        });
      }

      if (!snapshot?.reviews.length) {
        logGoogleReviews("READ", "Request finished — using UI fallback", {
          dataSource: "fallback",
          reason: snapshot ? "empty-reviews-array" : "no-firestore-snapshot",
          placesApiCalled: false,
          firestoreRead: firestoreReadOnCacheMiss,
          nextCacheHit: !firestoreReadOnCacheMiss,
        });
        return null;
      }

      logGoogleReviews("READ", "Request finished — snapshot served to page", {
        dataSource: firestoreReadOnCacheMiss
          ? "firestore (next-cache miss)"
          : "next-js-cache (next-cache hit)",
        placesApiCalled: false,
        firestoreRead: firestoreReadOnCacheMiss,
        nextCacheHit: !firestoreReadOnCacheMiss,
        ...formatSnapshotMeta(snapshot),
      });

      return snapshot;
    } catch (error) {
      console.error(`${LOG_PREFIX} READ | Firestore read failed`, error);
      logGoogleReviews("READ", "Request finished — using UI fallback", {
        dataSource: "fallback",
        reason: "firestore-read-error",
        placesApiCalled: false,
        firestoreRead: firestoreReadOnCacheMiss,
        nextCacheHit: !firestoreReadOnCacheMiss,
      });
      return null;
    }
  }
);
