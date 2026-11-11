"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { SlimCrossIcon } from "@/components/ui/Icons";

const STORAGE_KEY = "foodLicenseShown";
const OPEN_DELAY_MS = 1200;

const hasSeenPopup = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // storage blocked (private mode etc.) — don't nag the user
    return true;
  }
};

const markPopupSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore
  }
};

/**
 * One-time popup on the homepage showing the Food License certificate.
 * Once shown, it never appears again for that browser.
 */
const FoodLicensePopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  // open once, after a short delay
  useEffect(() => {
    if (hasSeenPopup()) return;

    const timer = window.setTimeout(() => {
      setIsOpen(true);
      markPopupSeen();
    }, OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  // lock scroll + close on Escape while open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => setIsOpen(false);

  return (
    <div
      className="animate-azadi-popup-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-license-popup-title"
    >
      <div
        className="animate-azadi-popup-in relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[32px] bg-[#F2EEE6] shadow-2xl md:rounded-[40px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:opacity-80 md:top-5 md:right-5"
          aria-label="Close"
        >
          <SlimCrossIcon className="h-3 w-3 text-[#302A25]" />
        </button>

        {/* header */}
        <div className="px-6 pt-6 pr-16 md:px-8 md:pt-8">
          <h2
            id="food-license-popup-title"
            className="text-[20px] leading-tight font-semibold text-[#302A25] md:text-[26px]"
          >
            Certified &amp; Food Licensed
          </h2>
          <p className="mt-1.5 text-[13px] text-[#6B5D4D] md:text-[15px]">
            Al-Barakah Honey is registered with the food authority — pure
            honey you can trust.
          </p>
        </div>

        {/* certificate */}
        <div className="flex min-h-0 flex-1 justify-center overflow-hidden px-6 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
          <div className="flex max-h-full overflow-hidden rounded-[20px] border border-[#EDE4D3] bg-white p-2 md:rounded-[24px] md:p-3">
            <Image
              src="/images/Food License Certificate.webp"
              alt="Al-Barakah Honey Food License Certificate"
              width={1754}
              height={1240}
              sizes="(max-width: 768px) 92vw, 680px"
              className="h-auto max-h-[calc(92vh-200px)] w-auto max-w-full rounded-[14px] object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodLicensePopup;
