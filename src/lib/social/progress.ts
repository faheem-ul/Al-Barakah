import type { SocialPost } from "@/lib/social/types";

export type SocialPublishStep = "cloudinary" | "facebook" | "instagram";

export type SocialPublishStepStatus =
  | "started"
  | "completed"
  | "failed"
  | "skipped";

export type SocialPublishProgressEvent = {
  type: "progress";
  step: SocialPublishStep;
  status: SocialPublishStepStatus;
  message?: string;
  error?: string;
  durationMs?: number;
  postId?: string;
  imageIndex?: number;
  imageTotal?: number;
};

export type SocialPublishCompleteEvent = {
  type: "complete";
  post: SocialPost;
};

export type SocialPublishErrorEvent = {
  type: "error";
  error: string;
};

export type SocialPublishStreamEvent =
  | SocialPublishProgressEvent
  | SocialPublishCompleteEvent
  | SocialPublishErrorEvent;

export type PublishProgressReporter = (
  event: SocialPublishProgressEvent,
) => void;

export function serializePublishEvent(
  event: SocialPublishStreamEvent,
): string {
  return `${JSON.stringify(event)}\n`;
}
