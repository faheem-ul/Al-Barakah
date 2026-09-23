"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import AdminNav from "@/components/Admin/AdminNav";
import AdminSidebarShell from "@/components/Admin/AdminSidebarShell";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/Text";
import { publishWithProgress } from "@/lib/social/client-publish";
import { SOCIAL_MAX_IMAGES } from "@/lib/social/limits";
import type { SocialPublishProgressEvent } from "@/lib/social/progress";
import type { SocialPost } from "@/lib/social/types";
import { BurgerMenuIcon } from "@/ui/Icons";
import logo from "@/public/logo.png";

import CreatePostForm, { type PublishPayload } from "./CreatePostForm";
import PublishingHistory from "./PublishingHistory";
import SocialSheet from "./SocialSheet";
import { useSocialHistory } from "./useSocialHistory";

const MAIN_PUBLISH_TOAST_ID = "social-publish";

function stepLoadingMessage(event: SocialPublishProgressEvent) {
  if (event.step === "cloudinary") {
    if (event.imageIndex && event.imageTotal && event.imageTotal > 1) {
      return event.message || `Uploading to Cloudinary… ${event.imageIndex}/${event.imageTotal}`;
    }
    return "Uploading image to Cloudinary…";
  }
  if (event.step === "facebook") return "Publishing to Facebook…";
  if (event.message?.toLowerCase().includes("reel")) return event.message;
  return "Publishing to Instagram…";
}

function stepSuccessMessage(event: SocialPublishProgressEvent) {
  if (event.step === "cloudinary") {
    if (event.message) return event.message;
    return "Cloudinary: image uploaded";
  }
  if (event.step === "facebook") {
    return event.message?.includes("supports") ? event.message : "Facebook: published";
  }
  return "Instagram: published";
}

function stepFailureLabel(step: SocialPublishProgressEvent["step"]) {
  if (step === "cloudinary") return "Cloudinary";
  if (step === "facebook") return "Facebook";
  return "Instagram";
}

function handlePublishProgress(event: SocialPublishProgressEvent) {
  const isBatchCloudinary =
    event.step === "cloudinary" &&
    event.imageTotal !== undefined &&
    event.imageTotal > 1;

  if (event.status === "started") {
    toast.loading(stepLoadingMessage(event), {
      id: MAIN_PUBLISH_TOAST_ID,
    });
    return;
  }

  if (event.status === "completed") {
    if (isBatchCloudinary) {
      toast.loading(event.message || stepSuccessMessage(event), {
        id: MAIN_PUBLISH_TOAST_ID,
      });
      return;
    }

    toast.loading(stepSuccessMessage(event), {
      id: MAIN_PUBLISH_TOAST_ID,
    });
    if (event.step !== "cloudinary") {
      toast.success(stepSuccessMessage(event));
    }
    return;
  }

  if (event.status === "failed") {
    toast.error(`${stepFailureLabel(event.step)}: ${event.error || "failed"}`);
  }
}

function summarizePublishResults(
  post: SocialPost,
  platforms: ("facebook" | "instagram")[],
) {
  const published = platforms.filter(
    (platform) => post.platformResults[platform]?.status === "published",
  );
  const failed = platforms.filter(
    (platform) => post.platformResults[platform]?.status === "failed",
  );

  return { published, failed };
}

const SocialPublisher: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formResetSignal, setFormResetSignal] = useState(0);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const history = useSocialHistory(getToken);

  const handlePublish = async ({
    caption,
    imageFiles,
    videoFile,
    platforms,
  }: PublishPayload) => {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }

    if (videoFile && imageFiles.length > 0) {
      toast.error("Upload either one video or images, not both.");
      return;
    }

    if (imageFiles.length > SOCIAL_MAX_IMAGES) {
      toast.error(`You can upload up to ${SOCIAL_MAX_IMAGES} images.`);
      return;
    }

    setPublishing(true);
    toast.loading("Sending post…", { id: MAIN_PUBLISH_TOAST_ID });

    try {
      const token = await user.getIdToken();

      const result = await publishWithProgress({
        caption,
        platforms,
        imageFiles,
        videoFile,
        token,
        onProgress: handlePublishProgress,
      });

      if (!result.ok) {
        toast.error(result.error || "Could not publish the post.", {
          id: MAIN_PUBLISH_TOAST_ID,
        });
        return;
      }

      const post = result.post;
      setFormResetSignal((signal) => signal + 1);
      await history.refresh();

      const { published, failed } = summarizePublishResults(post, platforms);
      const facebookWarning = post.platformResults.facebook?.warning;

      if (facebookWarning) {
        toast.warning(facebookWarning);
      }

      if (published.length === platforms.length) {
        toast.success("All platforms published", {
          id: MAIN_PUBLISH_TOAST_ID,
        });
      } else if (published.length > 0) {
        toast.warning("Published with errors", {
          id: MAIN_PUBLISH_TOAST_ID,
        });
      } else {
        toast.error("Publish failed", { id: MAIN_PUBLISH_TOAST_ID });
      }

      if (failed.length > 0) {
        console.warn("[social/publish] Platform failures", {
          failed,
          postId: post.id,
        });
      }
    } catch (error) {
      console.error("Failed to publish social post", error);
      toast.error("Could not publish the post.", {
        id: MAIN_PUBLISH_TOAST_ID,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="h-screen bg-[#F7F7F7] flex overflow-hidden">
      <AdminSidebarShell>
        <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6B6B] px-2 mb-3">
          Admin
        </Text>
        <AdminNav variant="sidebar" />
      </AdminSidebarShell>

      <SocialSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onLogout={logout}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="md:hidden bg-white border-b border-black/10 shrink-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <Image src={logo} alt="Albaraka Honey" className="w-[90px] shrink-0" />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="shrink-0 p-1 cursor-pointer"
            >
              <BurgerMenuIcon />
            </button>
          </div>
        </header>

        <header className="hidden md:block bg-white border-b border-black/10 shrink-0 z-10">
          <div className="w-full px-8 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Text className="text-[20px] font-semibold text-black">
                Social Publisher
              </Text>
              <Text className="text-[13px] text-[#6B6B6B] truncate">
                {user?.email || "Admin"}
              </Text>
            </div>
            <Button
              type="button"
              onClick={logout}
              className="rounded-md bg-black text-white text-[14px] px-4 py-2 hover:opacity-90 shrink-0"
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-light px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            <CreatePostForm
              publishing={publishing}
              onPublish={handlePublish}
              resetSignal={formResetSignal}
            />
            <PublishingHistory
              posts={history.posts}
              loading={history.loading}
              page={history.page}
              hasMore={history.hasMore}
              rangeStart={history.rangeStart}
              rangeEnd={history.rangeEnd}
              onPrev={() => void history.goPrev()}
              onNext={() => void history.goNext()}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialPublisher;
