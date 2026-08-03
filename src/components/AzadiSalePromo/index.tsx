"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { CloseIcon } from "@/ui/Icons";

const STORAGE_KEY = "azadi-sale-popup-dismissed";
const AUDIO_VOLUME = 0.25;

const AzadiSalePromo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = AUDIO_VOLUME;

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

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setIsOpen(false);
  };

  return (
    <>
      <audio ref={audioRef} src="/music/azadi-sale.mp3" loop preload="auto" />

      {isOpen && (
        <div
          className="animate-azadi-popup-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Azadi Sale"
        >
          <div
            className="animate-azadi-popup-in relative max-h-[82vh] max-w-[min(88vw,700px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute -top-2 -right-2 z-10 cursor-pointer rounded-full bg-white shadow-md sm:-top-3 sm:-right-3"
              aria-label="Close"
            >
              <CloseIcon className="h-8 w-8 sm:h-9 sm:w-9" />
            </button>

            <Image
              src="/images/azadi-sale/azadi-sale-poster.png"
              alt="Azadi Sale"
              width={480}
              height={665}
              className="h-auto max-h-[75vh] w-full object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AzadiSalePromo;
