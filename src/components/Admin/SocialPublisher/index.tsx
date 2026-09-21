"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import SocialSheet from "./SocialSheet";

const MAIN_PUBLISH_TOAST_ID = "social-publish";

function stepLoadingMessage(event: SocialPublishProgressEvent) {
  if (event.step === "cloudinary") {
    if (event.imageIndex && event.imageTotal && event.imageTotal > 1) {
      return event.message || `Uploading to Cloudinary… ${event.imageIndex}/${event.imageTotal}`;
    }
    return "Uploading image to Cloudinary…";
  }
  if (event.step === "facebook") return "Publishing to Facebook…";
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

function getPostMediaUrls(post: SocialPost) {
  if (post.mediaUrls?.length > 0) return post.mediaUrls;
  return post.mediaUrl ? [post.mediaUrl] : [];
}

function platformLabel(status?: string) {
  if (status === "published") return "Published";
  if (status === "failed") return "Failed";
  if (status === "not_implemented") return "Not connected yet";
  if (status === "pending") return "Pending";
  return "—";
}

const SocialPublisher: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [facebook, setFacebook] = useState(true);
  const [instagram, setInstagram] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState<SocialPost[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/social/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        posts?: SocialPost[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Could not load history.");
      }
      setHistory(data?.posts ?? []);
    } catch (error) {
      console.error("Failed to load social posts", error);
      toast.error("Could not load publishing history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleImageSelection = (files: FileList | null) => {
    if (!files) return;

    const next = [...imageFiles];
    for (const file of Array.from(files)) {
      if (next.length >= SOCIAL_MAX_IMAGES) break;
      next.push(file);
    }

    if (next.length > SOCIAL_MAX_IMAGES) {
      toast.error(`You can upload up to ${SOCIAL_MAX_IMAGES} images.`);
    }

    setImageFiles(next.slice(0, SOCIAL_MAX_IMAGES));
  };

  const removeImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }
    const platforms: ("facebook" | "instagram")[] = [];
    if (facebook) platforms.push("facebook");
    if (instagram) platforms.push("instagram");

    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    const nextCaption = caption.trim();
    if (!nextCaption && imageFiles.length === 0) {
      toast.error("Add a caption or an image.");
      return;
    }

    if (instagram && imageFiles.length === 0) {
      toast.error("Instagram requires at least one image.");
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
      const form = new FormData();
      form.set("caption", nextCaption);
      form.set("platforms", JSON.stringify(platforms));
      imageFiles.forEach((file) => form.append("images", file));

      const result = await publishWithProgress({
        formData: form,
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
      setHistory((prev) => [post, ...prev]);
      setCaption("");
      setImageFiles([]);
      setImageInputKey((key) => key + 1);

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
            <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
              <Text className="text-[16px] font-semibold text-black mb-1">
                Create post
              </Text>
              <Text className="text-[13px] text-[#6B6B6B] mb-5">
                Instagram: up to {SOCIAL_MAX_IMAGES} images (carousel). Facebook:
                up to 4 photos (first 4 used if you select more).
              </Text>

              <form onSubmit={handlePublish} className="space-y-5">
                <label className="block">
                  <span className="block text-[13px] font-semibold text-black mb-1.5">
                    Caption
                  </span>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={5}
                    placeholder="Write the post caption…"
                    className="w-full rounded-lg border border-black/15 bg-[#F7F7F7] px-3 py-2.5 text-[14px] text-black placeholder:text-[#9ca3af] outline-none focus:border-black/40"
                  />
                </label>

                <label className="block">
                  <span className="block text-[13px] font-semibold text-black mb-1.5">
                    Images
                    {imageFiles.length > 0 ? (
                      <span className="font-normal text-[#6B6B6B]">
                        {" "}
                        ({imageFiles.length}/{SOCIAL_MAX_IMAGES})
                      </span>
                    ) : null}
                  </span>
                  <input
                    key={imageInputKey}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                    onChange={(e) => {
                      handleImageSelection(e.target.files);
                      e.target.value = "";
                    }}
                    className="block w-full text-[13px] text-[#6B6B6B] file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
                  />
                  {previewUrls.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {previewUrls.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="relative rounded-lg border border-black/10 bg-[#F7F7F7] overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Selected image ${index + 1}`}
                            className="w-full h-28 object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove image ${index + 1}`}
                            onClick={() => removeImageAt(index)}
                            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/75 text-white text-[14px] leading-none"
                          >
                            ×
                          </button>
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </label>

                <fieldset>
                  <legend className="text-[13px] font-semibold text-black mb-2">
                    Publish to
                  </legend>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[14px] text-black">
                      <input
                        type="checkbox"
                        checked={facebook}
                        onChange={(e) => setFacebook(e.target.checked)}
                        className="size-4 accent-black"
                      />
                      Facebook
                    </label>
                    <label className="flex items-start gap-2 text-[14px] text-black">
                      <input
                        type="checkbox"
                        checked={instagram}
                        onChange={(e) => setInstagram(e.target.checked)}
                        className="size-4 mt-0.5 accent-black"
                      />
                      <span>
                        Instagram
                        <span className="block text-[12px] text-[#6B6B6B]">
                          Requires at least one image (separate from Facebook Page)
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[14px] text-[#9ca3af]">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="size-4 mt-0.5 accent-black"
                      />
                      <span>
                        TikTok
                        <span className="block text-[12px]">Coming later</span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <Button
                  type="submit"
                  isLoading={publishing}
                  disabled={publishing}
                  fill="#ffffff"
                  className="rounded-md bg-black text-white text-[14px] px-5 py-2.5 hover:opacity-90"
                >
                  Publish
                </Button>
              </form>
            </section>

            <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
              <Text className="text-[16px] font-semibold text-black mb-1">
                Publishing history
              </Text>
              {historyLoading ? (
                <Text className="text-[13px] text-[#6B6B6B]">Loading…</Text>
              ) : history.length === 0 ? (
                <Text className="text-[13px] text-[#6B6B6B]">
                  No posts yet. Published posts will appear here.
                </Text>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-black/10 text-[#6B6B6B]">
                        <th className="py-2 pr-3 font-semibold">Date</th>
                        <th className="py-2 pr-3 font-semibold">Caption</th>
                        <th className="py-2 pr-3 font-semibold">Facebook</th>
                        <th className="py-2 font-semibold">Instagram</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((post) => {
                        const mediaUrls = getPostMediaUrls(post);
                        const extraCount = mediaUrls.length - 1;

                        return (
                          <tr key={post.id} className="border-b border-black/5">
                            <td className="py-2 pr-3 whitespace-nowrap text-[#6B6B6B]">
                              {new Date(post.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3 text-black">
                              <div className="flex items-center gap-2 min-w-0">
                                {mediaUrls[0] ? (
                                  <div className="relative shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={mediaUrls[0]}
                                      alt=""
                                      className="size-10 rounded object-cover border border-black/10"
                                    />
                                    {extraCount > 0 ? (
                                      <span className="absolute -bottom-1 -right-1 rounded bg-black px-1 py-0.5 text-[10px] text-white">
                                        +{extraCount}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                <span className="truncate">
                                  {post.caption || "(image)"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 pr-3 text-black">
                              <span>
                                {platformLabel(post.platformResults.facebook?.status)}
                              </span>
                              {post.platformResults.facebook?.warning ? (
                                <span className="block text-[12px] text-[#b54708]">
                                  {post.platformResults.facebook.warning}
                                </span>
                              ) : null}
                              {post.platformResults.facebook?.error ? (
                                <span className="block text-[12px] text-[#b42318]">
                                  {post.platformResults.facebook.error}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 text-black">
                              <span>
                                {platformLabel(post.platformResults.instagram?.status)}
                              </span>
                              {post.platformResults.instagram?.error ? (
                                <span className="block text-[12px] text-[#b42318]">
                                  {post.platformResults.instagram.error}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialPublisher;
