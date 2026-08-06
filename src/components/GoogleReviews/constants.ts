import type { GoogleReview, GoogleReviewsSnapshot } from "@/lib/google-reviews";

// Google reviews URL
export const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?q=albaraka+honey#lrd=0x85f3813785102667:0x67cd6ef3e0bb63be,1,,,,";

// Google write review URL
export const GOOGLE_WRITE_REVIEW_URL =
  "https://search.google.com/local/writereview?placeid=ChIJZyYQhTeB84URvmO74PNuzWc";

// Fallback reviews for when the Google reviews snapshot is not available
export const FALLBACK_REVIEWS: GoogleReview[] = [
  {
    id: "places/ChIJZyYQhTeB84URvmO74PNuzWc/reviews/Ci9DQUlRQUNvZENodHljRjlvT21aWmVYZ3dVbGRUTTJ0elRXUndjamx2Y2pOS2IwRRAB",
    authorName: "Nafees Ul Hassan Jafari",
    authorUri:
      "https://www.google.com/maps/contrib/103455233543613788588/reviews",
    authorPhotoUri:
      "https://lh3.googleusercontent.com/a-/ALV-UjWHrOt77nOMUFWphCN1-t4mkwmsVOjch_uTwn56yu5j3vyANFt1bg=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "I recently purchased honey from Al Baraka Honey, and I am genuinely impressed with the quality. The honey tastes pure, fresh, and completely natural. You can easily tell it is authentic and not overly processed like many products available in the market.\nThe packaging was excellent, delivery was on time, and the overall experience was smooth. If you're looking for high-quality, genuine honey, I highly recommend Al Baraka Honey. I will definitely order again.",
    relativePublishTimeDescription: "in the last week",
    publishTime: "2026-08-05T11:00:52.724532589Z",
    googleMapsUri:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT21aWmVYZ3dVbGRUTTJ0elRXUndjamx2Y2pOS2IwRRAB!2m1!1s0x85f3813785102667:0x67cd6ef3e0bb63be",
    flagContentUri:
      "https://www.google.com/local/content/rap/report?postId=Ci9DQUlRQUNvZENodHljRjlvT21aWmVYZ3dVbGRUTTJ0elRXUndjamx2Y2pOS2IwRRAB&d=17924085&t=1",
  },
  {
    id: "places/ChIJZyYQhTeB84URvmO74PNuzWc/reviews/Ci9DQUlRQUNvZENodHljRjlvT2s4elgxODNlR0pmT1RGdGJVc3RhbWRCUWtGbkxVRRAB",
    authorName: "Afzal Khan",
    authorUri:
      "https://www.google.com/maps/contrib/105793596705366700635/reviews",
    authorPhotoUri:
      "https://lh3.googleusercontent.com/a/ACg8ocJQn0LZiy1gwOlRUCZBhP7wreUNSK6rIbuHMCzecLiB4pJhfg=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Okay so I usually don't post reviews, but Al-Baraka Honey actually deserves the hype. I've been trying to eat cleaner lately and swapped out refined sugar for this, and the difference is night and day. It doesn't have that fake, hyper-processed artificial sweet taste—you can tell it's 100% pure raw honey right off the batch. I've been taking a spoonful in warm water every morning, and honestly my energy levels and digestion have been so much better. It's lowkey become an essential part of my daily routine now. If you're looking for authentic honey that actually delivers on health benefits, don't sleep on this. 10/10 elite quality! 🍯🔥",
    relativePublishTimeDescription: "in the last week",
    publishTime: "2026-08-05T10:58:00.930385754Z",
    googleMapsUri:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2s4elgxODNlR0pmT1RGdGJVc3RhbWRCUWtGbkxVRRAB!2m1!1s0x85f3813785102667:0x67cd6ef3e0bb63be",
    flagContentUri:
      "https://www.google.com/local/content/rap/report?postId=Ci9DQUlRQUNvZENodHljRjlvT2s4elgxODNlR0pmT1RGdGJVc3RhbWRCUWtGbkxVRRAB&d=17924085&t=1",
  },
  {
    id: "places/ChIJZyYQhTeB84URvmO74PNuzWc/reviews/Ci9DQUlRQUNvZENodHljRjlvT21WRmFIVTJkM2hEZEU4dGNHdFZjSGx3TjNkb1lWRRAB",
    authorName: "Usama Bin Abdul",
    authorUri:
      "https://www.google.com/maps/contrib/112349947212069387487/reviews",
    authorPhotoUri:
      "https://lh3.googleusercontent.com/a/ACg8ocKmYOlPbplYhXeEd7mdbupRmKjTAx_FUSMFDA4qz8ywaQhk3Q=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Absolutely pure, rich in natural taste, and one of the best honey products I've ever tried—highly recommended!",
    relativePublishTimeDescription: "a week ago",
    publishTime: "2026-07-24T20:09:29.457874544Z",
    googleMapsUri:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT21WRmFIVTJkM2hEZEU4dGNHdFZjSGx3TjNkb1lWRRAB!2m1!1s0x85f3813785102667:0x67cd6ef3e0bb63be",
    flagContentUri:
      "https://www.google.com/local/content/rap/report?postId=Ci9DQUlRQUNvZENodHljRjlvT21WRmFIVTJkM2hEZEU4dGNHdFZjSGx3TjNkb1lWRRAB&d=17924085&t=1",
  },
  {
    id: "places/ChIJZyYQhTeB84URvmO74PNuzWc/reviews/Ci9DQUlRQUNvZENodHljRjlvT2podlZEVjNhVmxyTnkxTFQzbzJRMUpTY0VWMlZVRRAB",
    authorName: "Eman Fatima",
    authorUri:
      "https://www.google.com/maps/contrib/117737301210342229454/reviews",
    authorPhotoUri:
      "https://lh3.googleusercontent.com/a/ACg8ocIFCIFMGIy2O_1CYE5htbHPxJvIBhX_bY4Xt1oJB0NxUviBSw=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Highly Recommended!",
    relativePublishTimeDescription: "a week ago",
    publishTime: "2026-07-24T20:08:01.927829779Z",
    googleMapsUri:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2podlZEVjNhVmxyTnkxTFQzbzJRMUpTY0VWMlZVRRAB!2m1!1s0x85f3813785102667:0x67cd6ef3e0bb63be",
    flagContentUri:
      "https://www.google.com/local/content/rap/report?postId=Ci9DQUlRQUNvZENodHljRjlvT2podlZEVjNhVmxyTnkxTFQzbzJRMUpTY0VWMlZVRRAB&d=17924085&t=1",
  },
  {
    id: "places/ChIJZyYQhTeB84URvmO74PNuzWc/reviews/Ci9DQUlRQUNvZENodHljRjlvT2twTVdFMVBUV2hSWmtkNlUxSmtVV0pwY1hFMlJrRRAB",
    authorName: "Adil R",
    authorUri:
      "https://www.google.com/maps/contrib/110831159421429882669/reviews",
    authorPhotoUri:
      "https://lh3.googleusercontent.com/a/ACg8ocIEmFvcpt18ogEM0ZzeNQleG-gPa5psTi2G8aMdtZmKKPDLpw=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Excellent honey! The packaging is clean and premium, the taste is delicious and authentic, and the quality is top-notch. I'm very satisfied with this purchase and would definitely recommend it to others.",
    relativePublishTimeDescription: "a week ago",
    publishTime: "2026-07-24T19:51:46.831407785Z",
    googleMapsUri:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2twTVdFMVBUV2hSWmtkNlUxSmtVV0pwY1hFMlJrRRAB!2m1!1s0x85f3813785102667:0x67cd6ef3e0bb63be",
    flagContentUri:
      "https://www.google.com/local/content/rap/report?postId=Ci9DQUlRQUNvZENodHljRjlvT2twTVdFMVBUV2hSWmtkNlUxSmtVV0pwY1hFMlJrRRAB&d=17924085&t=1",
  },
];

// Fallback snapshot for when the Google reviews snapshot is not available
export const FALLBACK_SNAPSHOT: GoogleReviewsSnapshot = {
  source: "google-places-new",
  placeId: "ChIJZyYQhTeB84URvmO74PNuzWc",
  placeName: "Albarakahoney",
  rating: 5,
  totalReviews: 5,
  googleMapsUri: GOOGLE_REVIEWS_URL,
  reviews: FALLBACK_REVIEWS,
  fetchedAt: 0,
  expiresAt: 0,
};
