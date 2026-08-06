import { getGoogleReviewsSnapshot } from "@/lib/google-reviews";

import GoogleReviewsClient from "./GoogleReviewsClient";

// Google Reviews Component
const GoogleReviews = async () => {
  const snapshot = await getGoogleReviewsSnapshot();

  // Render the Google Reviews Client
  return <GoogleReviewsClient snapshot={snapshot} />;
};

export default GoogleReviews;
