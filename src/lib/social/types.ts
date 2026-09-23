export type SocialPlatform = "facebook" | "instagram" | "tiktok";

export type SocialMediaType = "image" | "video" | "carousel";

export type SocialPostStatus = "pending" | "partial" | "published" | "failed";

export type SocialPlatformStatus =
  | "pending"
  | "published"
  | "failed"
  | "not_implemented";

export type SocialPlatformResult = {
  status: SocialPlatformStatus;
  postId?: string;
  error?: string;
  warning?: string;
};

export type SocialPlatformResults = Partial<
  Record<SocialPlatform, SocialPlatformResult>
>;

export type SocialPost = {
  id: string;
  caption: string;
  mediaUrl: string;
  mediaUrls: string[];
  mediaType: SocialMediaType;
  platforms: SocialPlatform[];
  status: SocialPostStatus;
  platformResults: SocialPlatformResults;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateSocialPostInput = {
  caption: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaType?: SocialMediaType;
  platforms: SocialPlatform[];
  createdBy: string;
};
