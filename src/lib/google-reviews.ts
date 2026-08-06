import "server-only";

import { unstable_cache } from "next/cache";

import { getAdminDb } from "@/lib/firebase/admin";

export const GOOGLE_REVIEWS_CACHE_TAG = "google-reviews";
const GOOGLE_REVIEWS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
export const GOOGLE_REVIEWS_CACHE_TTL_MS =
  GOOGLE_REVIEWS_CACHE_TTL_SECONDS * 1000;

const GOOGLE_REVIEWS_COLLECTION = "googlereviews";
const GOOGLE_REVIEWS_DOCUMENT = "cache";
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

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      "X-Goog-Api-Key": requiredEnv("GOOGLE_PLACES_API_KEY"),
      "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
    },
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Google Places request failed (${response.status}): ${responseBody.slice(
        0,
        500
      )}`
    );
  }

  return (await response.json()) as GooglePlaceDetailsResponse;
};

// Sync the Google reviews
export const syncGoogleReviews = async (
  now = Date.now()
): Promise<GoogleReviewsSyncResult> => {
  const document = getSnapshotDocument();
  const existingDocument = await document.get();
  const existingData = existingDocument.data();

  if (
    isGoogleReviewsSnapshot(existingData) &&
    isGoogleReviewsSnapshotFresh(existingData, now)
  ) {
    console.info(
      "[Google Reviews] Sync skipped: using fresh Firestore data.",
      {
        reviewCount: existingData.reviews.length,
        fetchedAt: new Date(existingData.fetchedAt).toISOString(),
        expiresAt: new Date(existingData.expiresAt).toISOString(),
      }
    );
    return { status: "skipped", snapshot: existingData };
  }

  console.info(
    "[Google Reviews] Firestore data is missing or stale; starting a fresh Places API call."
  );

  const place = await fetchGooglePlaceDetails();
  const snapshot = parseGooglePlaceDetails(place, now);

  await document.set(snapshot);

  console.info(
    "[Google Reviews] Fresh Places API data stored in Firestore.",
    {
      reviewCount: snapshot.reviews.length,
      fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
      expiresAt: new Date(snapshot.expiresAt).toISOString(),
    }
  );

  return { status: "updated", snapshot };
};

// Read the Google reviews snapshot from the cache
const readGoogleReviewsSnapshot = unstable_cache(
  async (): Promise<GoogleReviewsSnapshot | null> => {
    const document = await getSnapshotDocument().get();
    const data = document.data();

    return isGoogleReviewsSnapshot(data) ? data : null;
  },
  ["google-reviews-snapshot"],
  {
    revalidate: GOOGLE_REVIEWS_CACHE_TTL_SECONDS,
    tags: [GOOGLE_REVIEWS_CACHE_TAG],
  }
);

// Get the Google reviews snapshot from the cache
export const getGoogleReviewsSnapshot =
  async (): Promise<GoogleReviewsSnapshot | null> => {
    const hasFirebaseAdminConfig = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ].every((name) => Boolean(process.env[name]));

    if (!hasFirebaseAdminConfig) {
      console.info(
        "[Google Reviews] Source: fallback (Firebase Admin configuration is missing)."
      );
      return null;
    }

    try {
      const snapshot = await readGoogleReviewsSnapshot();

      if (!snapshot?.reviews.length) {
        console.info(
          "[Google Reviews] Source: fallback (no valid Firestore reviews found)."
        );
        return null;
      }

      console.info("[Google Reviews] Source: Firestore.", {
        reviewCount: snapshot.reviews.length,
        fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
        expiresAt: new Date(snapshot.expiresAt).toISOString(),
      });

      return snapshot;
    } catch (error) {
      console.error("Failed to read cached Google reviews", error);
      console.info(
        "[Google Reviews] Source: fallback (Firestore read failed)."
      );
      return null;
    }
  };
