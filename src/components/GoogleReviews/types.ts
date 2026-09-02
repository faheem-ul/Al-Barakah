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

export type GoogleReviewsSnapshot = {
  placeName: string;
  rating: number;
  totalReviews: number;
  googleMapsUri: string;
  reviews: GoogleReview[];
};
