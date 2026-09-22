"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import Text from "@/components/ui/Text";
import { SOCIAL_MAX_IMAGES } from "@/lib/social/limits";

export type PublishPayload = {
  caption: string;
  imageFiles: File[];
  videoFile: File | null;
  platforms: ("facebook" | "instagram")[];
};

type CreatePostFormProps = {
  publishing: boolean;
  onPublish: (payload: PublishPayload) => Promise<void>;
  resetSignal?: number;
};

type PlatformKey = "facebook" | "instagram";

const PLATFORM_TOGGLES: {
  key: PlatformKey | "tiktok";
  label: string;
  disabled?: boolean;
  hint?: string;
}[] = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok", hint: "Coming soon", disabled: true },
];

const ACCEPT_MEDIA =
  "image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/quicktime";

type PlatformToggleProps = {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function PlatformToggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: PlatformToggleProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
        disabled
          ? "border-black/5 bg-[#FAFAFA]"
          : "border-black/10 bg-white"
      }`}
    >
      <div className="min-w-0">
        <span
          className={`block text-[14px] font-medium ${
            disabled ? "text-[#9ca3af]" : "text-black"
          }`}
        >
          {label}
        </span>
        {hint ? (
          <span className="block text-[12px] text-[#6B6B6B]">{hint}</span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-black" : "bg-[#e5e7eb]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function resetFormState() {
  return {
    caption: "",
    imageFiles: [] as File[],
    videoFile: null as File | null,
    mediaInputKey: 0,
    facebook: true,
    instagram: true,
  };
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({
  publishing,
  onPublish,
  resetSignal = 0,
}) => {
  const [caption, setCaption] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [facebook, setFacebook] = useState(true);
  const [instagram, setInstagram] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resetSignal === 0) return;
    const next = resetFormState();
    setCaption(next.caption);
    setImageFiles(next.imageFiles);
    setVideoFile(next.videoFile);
    setMediaInputKey((key) => key + 1);
    setFacebook(next.facebook);
    setInstagram(next.instagram);
  }, [resetSignal]);

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

  const videoPreviewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleMediaSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    const hasVideo = selected.some((file) => file.type.startsWith("video/"));
    const hasImage = selected.some((file) => file.type.startsWith("image/"));

    if (hasVideo && hasImage) {
      toast.error("Upload either one video or images, not both.");
      return;
    }

    if (hasVideo) {
      if (selected.length > 1) {
        toast.error("Only one video can be uploaded per post.");
        return;
      }
      setImageFiles([]);
      setVideoFile(selected[0]);
      return;
    }

    setVideoFile(null);
    const next = [...imageFiles];
    for (const file of selected) {
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

  const clearVideo = () => {
    setVideoFile(null);
  };

  const togglePlatform = (key: PlatformKey) => {
    if (key === "facebook") setFacebook((prev) => !prev);
    if (key === "instagram") setInstagram((prev) => !prev);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const platforms: ("facebook" | "instagram")[] = [];
    if (facebook) platforms.push("facebook");
    if (instagram) platforms.push("instagram");

    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }

    const nextCaption = caption.trim();
    const hasMedia = imageFiles.length > 0 || Boolean(videoFile);

    if (!nextCaption && !hasMedia) {
      toast.error("Add a caption or media.");
      return;
    }

    if (instagram && !hasMedia) {
      toast.error("Instagram requires an image or video.");
      return;
    }

    if (videoFile && imageFiles.length > 0) {
      toast.error("Upload either one video or images, not both.");
      return;
    }

    await onPublish({
      caption: nextCaption,
      imageFiles,
      videoFile,
      platforms,
    });
  };

  const mediaLabel = videoFile
    ? "1 video"
    : imageFiles.length > 0
      ? `${imageFiles.length}/${SOCIAL_MAX_IMAGES} images`
      : null;

  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 md:p-6">
      <Text className="text-[16px] font-semibold text-black mb-1">
        Create post
      </Text>
      <Text className="text-[13px] text-[#6B6B6B] mb-5">
        Photos or one video — publish to your connected accounts.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-[13px] font-semibold text-black mb-1.5">
            Caption
          </span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Write the post caption…"
            className="w-full rounded-lg border border-black/15 bg-[#F7F7F7] px-3 py-2.5 text-[14px] text-black placeholder:text-[#9ca3af] outline-none focus:border-black/40"
          />
        </label>

        <div>
          <span className="block text-[13px] font-semibold text-black mb-1.5">
            Media
            {mediaLabel ? (
              <span className="font-normal text-[#6B6B6B]"> ({mediaLabel})</span>
            ) : null}
          </span>

          <input
            ref={fileInputRef}
            key={mediaInputKey}
            type="file"
            multiple={!videoFile}
            accept={ACCEPT_MEDIA}
            onChange={(e) => {
              handleMediaSelection(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleMediaSelection(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-black/40 bg-[#f3f4f6]"
                : "border-black/15 bg-[#FAFAFA] hover:border-black/30 hover:bg-[#F7F7F7]"
            }`}
          >
            <Upload className="size-5 text-[#6B6B6B]" aria-hidden="true" />
            <Text className="text-[13px] font-medium text-black">
              Drop files here or click to browse
            </Text>
            <Text className="text-[12px] text-[#6B6B6B]">
              Images (up to {SOCIAL_MAX_IMAGES}) or one MP4/MOV video
            </Text>
          </div>

          {videoPreviewUrl ? (
            <div className="mt-3 relative rounded-lg border border-black/10 bg-[#F7F7F7] overflow-hidden max-w-sm">
              <video
                src={videoPreviewUrl}
                controls
                className="w-full max-h-40 object-contain bg-black"
              />
              <button
                type="button"
                aria-label="Remove video"
                onClick={clearVideo}
                className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/75 text-white text-[14px] leading-none"
              >
                ×
              </button>
            </div>
          ) : previewUrls.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previewUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative rounded-lg border border-black/10 bg-[#F7F7F7] overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Selected image ${index + 1}`}
                    className="w-full h-20 object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => removeImageAt(index)}
                    className="absolute top-1 right-1 size-5 rounded-full bg-black/75 text-white text-[12px] leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <fieldset disabled={publishing}>
          <legend className="text-[13px] font-semibold text-black mb-2">
            Publish to
          </legend>
          <div className="space-y-2">
            {PLATFORM_TOGGLES.map((platform) => {
              const isTikTok = platform.key === "tiktok";
              const checked =
                !isTikTok &&
                ((platform.key === "facebook" && facebook) ||
                  (platform.key === "instagram" && instagram));

              return (
                <PlatformToggle
                  key={platform.key}
                  label={platform.label}
                  hint={platform.hint}
                  checked={checked}
                  disabled={platform.disabled || publishing}
                  onChange={() => {
                    if (platform.key === "facebook" || platform.key === "instagram") {
                      togglePlatform(platform.key);
                    }
                  }}
                />
              );
            })}
          </div>
        </fieldset>

        <Button
          type="submit"
          isLoading={publishing}
          disabled={publishing}
          fill="#ffffff"
          className="w-full sm:w-auto rounded-md bg-black text-white text-[14px] px-5 py-2.5 hover:opacity-90"
        >
          Publish
        </Button>
      </form>
    </section>
  );
};

export default CreatePostForm;
