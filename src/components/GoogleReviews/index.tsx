import GoogleReviewsClient from "./GoogleReviewsClient";
import { GOOGLE_REVIEWS_SNAPSHOT } from "./constants";

const GoogleReviews = () => (
  <GoogleReviewsClient snapshot={GOOGLE_REVIEWS_SNAPSHOT} />
);

export default GoogleReviews;
