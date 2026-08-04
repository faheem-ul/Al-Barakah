"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";

import { SlimCrossIcon } from "@/components/ui/Icons";

const STORAGE_KEY = "azadi-sale-popup-dismissed";
const MUTE_STORAGE_KEY = "azadi-sale-music-muted";
const AUDIO_VOLUME = 0.75;

const AzadiSalePromo = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // check if popup should be shown
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
      setIsMuted(localStorage.getItem(MUTE_STORAGE_KEY) === "1");
    } catch {
      setIsOpen(true);
    }
  }, []);

  // prevent scroll when popup is open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // play audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = AUDIO_VOLUME;
    audio.muted = isMuted;

    const resume = () => {
      void audio.play().catch(() => {});
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("click", resume);
    };

    void audio.play().catch(() => {
      document.addEventListener("pointerdown", resume);
      document.addEventListener("click", resume);
    });

    return () => {
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("click", resume);
      audio.pause();
    };
  }, []);

  // mute audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setIsOpen(false);
  };

  const handlePosterClick = () => {
    handleClose();
    router.push("/azadi-sale");
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <>
    {/* audio player */}
      <audio ref={audioRef} src="/music/azadi-sale.mp3" loop preload="auto" />

      {/* mute button */}
      <button
        type="button"
        onClick={toggleMute}
        className="fixed right-4 bottom-4 z-[110] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-[#302A25] shadow-md sm:right-6 sm:bottom-6"
        aria-label={isMuted ? "Unmute music" : "Mute music"}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>

      {/* popup - Azadi Sale */}
      {isOpen && (
        <div
          className="animate-azadi-popup-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Azadi Sale"
        >
          <div
            className="animate-azadi-popup-in relative max-h-[92vh] max-w-[min(94vw,900px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute -top-2 -right-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white shadow-md sm:-top-3 sm:-right-3 sm:h-9 sm:w-9"
              aria-label="Close"
            >
              <SlimCrossIcon className="h-3 w-3 text-[#302A25]" />
            </button>

            {/* poster button - Go to Azadi Sale */}
            <button
              type="button"
              onClick={handlePosterClick}
              className="block w-full cursor-pointer"
              aria-label="Go to Azadi Sale"
            >
              {/* poster image - Azadi Sale */}
              <Image
                src="/images/azadi-sale/azadi-sale-poster.png"
                alt="Azadi Sale"
                width={900}
                height={1245}
                className="h-auto max-h-[85vh] w-full object-contain"
                priority
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AzadiSalePromo;
