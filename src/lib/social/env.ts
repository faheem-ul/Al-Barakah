import "server-only";

/** Server-only Meta / Instagram config. Never return these values to the browser. */
export function getMetaPublisherEnv() {
  return {
    appId: process.env.META_APP_ID?.trim() || "",
    pageId: process.env.META_PAGE_ID?.trim() || "",
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN?.trim() || "",
    graphVersion: process.env.META_GRAPH_API_VERSION?.trim() || "v22.0",
    hasAppSecret: Boolean(process.env.META_APP_SECRET?.trim()),
  };
}

export function getInstagramPublisherEnv() {
  return {
    userId: process.env.INSTAGRAM_USER_ID?.trim() || "",
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || "",
    graphVersion:
      process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() ||
      process.env.META_GRAPH_API_VERSION?.trim() ||
      "v22.0",
  };
}

export function getCloudinaryEnv() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
    folder: process.env.CLOUDINARY_FOLDER?.trim() || "social-posts",
  };
}
