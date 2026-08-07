"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  formatDistanceToNowStrict,
} from "date-fns";
import { Check } from "lucide-react";

import { SlimCrossIcon } from "@/ui/Icons";
import type { RecentSale } from "@/lib/recent-sales.types";
import { salesPopupConfig } from "@/lib/salesPopup.config";

const PLACEHOLDER_IMAGE = "/images/placeholder.png";

type RecentSalesApiResponse = {
  sales?: RecentSale[];
};

const getShownSaleIds = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(salesPopupConfig.localStorageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

const markSaleShown = (saleId: string) => {
  if (typeof window === "undefined") return;

  try {
    const existing = getShownSaleIds();
    if (existing.includes(saleId)) return;

    window.localStorage.setItem(
      salesPopupConfig.localStorageKey,
      JSON.stringify([...existing, saleId])
    );
  } catch {
    // Ignore quota / private-mode failures — popup still works in-memory.
  }
};

const randomIntervalMs = () => {
  const { intervalMin, intervalMax } = salesPopupConfig;
  return (
    intervalMin + Math.floor(Math.random() * (intervalMax - intervalMin + 1))
  );
};

/**
 * Human-friendly relative timestamps for the popup.
 * Prefer short labels ("Just now", "Yesterday") over raw date-fns output.
 */
export const formatSaleRelativeTime = (
  createdAt: number,
  now = Date.now()
): string => {
  const date = new Date(createdAt);
  const minutes = differenceInMinutes(now, date);

  if (minutes < 1) return "Just now";
  if (minutes < 60) {
    return formatDistanceToNowStrict(date, { addSuffix: true, unit: "minute" });
  }

  const hours = differenceInHours(now, date);
  if (hours < 24) {
    return formatDistanceToNowStrict(date, { addSuffix: true, unit: "hour" });
  }

  const days = differenceInCalendarDays(now, date);
  if (days === 1) return "Yesterday";

  return formatDistanceToNowStrict(date, { addSuffix: true, unit: "day" });
};

/**
 * Storefront-only social proof popup fed by real Shopify orders.
 * Fetches `/api/recent-sales` once per mount; never fabricates purchases.
 */
const SalesPopup = () => {
  const [activeSale, setActiveSale] = useState<RecentSale | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const shownCountRef = useRef(0);
  const queueRef = useRef<RecentSale[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const hidePopup = useCallback(() => {
    setIsVisible(false);
    schedule(() => setActiveSale(null), 320);
  }, [schedule]);

  const showNext = useCallback(() => {
    if (shownCountRef.current >= salesPopupConfig.maxPerSession) {
      return;
    }

    const next = queueRef.current[0];
    if (!next) return;

    queueRef.current = queueRef.current.slice(1);

    setActiveSale(next);
    setIsVisible(true);
    setProgressKey((key) => key + 1);
    markSaleShown(next.id);
    shownCountRef.current += 1;

    schedule(() => {
      hidePopup();

      if (
        shownCountRef.current < salesPopupConfig.maxPerSession &&
        queueRef.current.length > 0
      ) {
        schedule(showNext, randomIntervalMs());
      }
    }, salesPopupConfig.displayDuration);
  }, [hidePopup, schedule]);

  useEffect(() => {
    if (!salesPopupConfig.enabled) return;

    let cancelled = false;

    const loadAndStart = async () => {
      try {
        const response = await fetch("/api/recent-sales");
        if (!response.ok) {
          throw new Error(`Recent sales request failed (${response.status})`);
        }

        const data = (await response.json()) as RecentSalesApiResponse;
        const sales = Array.isArray(data.sales) ? data.sales : [];
        const shownIds = new Set(getShownSaleIds());
        const eligible = sales.filter((sale) => !shownIds.has(sale.id));

        if (cancelled || eligible.length === 0) return;

        queueRef.current = eligible;
        shownCountRef.current = 0;
        schedule(showNext, salesPopupConfig.popupDelay);
      } catch (error) {
        console.error("[SalesPopup] Failed to fetch recent sales", error);
      }
    };

    void loadAndStart();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [clearTimers, schedule, showNext]);

  const handleClose = () => {
    clearTimers();
    hidePopup();

    if (
      shownCountRef.current < salesPopupConfig.maxPerSession &&
      queueRef.current.length > 0
    ) {
      schedule(showNext, randomIntervalMs());
    }
  };

  if (!salesPopupConfig.enabled || !activeSale) {
    return null;
  }

  const imageSrc = activeSale.productImage || PLACEHOLDER_IMAGE;
  const relativeTime = formatSaleRelativeTime(activeSale.createdAt);

  return (
    <div
      className={`fixed bottom-4 left-4 z-[90] w-[min(100%-2rem,340px)] transition-all duration-300 ease-out sm:bottom-6 sm:left-6 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-2 z-10 rounded-full p-1 text-[#9CA3AF] transition-colors hover:bg-black/5 hover:text-[#1D1D1B]"
          aria-label="Dismiss purchase notification"
        >
          <SlimCrossIcon className="h-3.5 w-3.5" />
        </button>

        <div className="flex gap-3 p-3 pr-8">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F7]">
            <Image
              src={imageSrc}
              alt={activeSale.productTitle}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[13px] font-medium text-[#1D1D1B]">
              {activeSale.firstName}{" "}
              <span className="font-normal text-[#6B7280]">
                ({activeSale.city})
              </span>
            </p>
            <p className="text-[12px] text-[#9CA3AF]">purchased</p>
            <p className="truncate text-[14px] font-semibold text-[#1D1D1B]">
              {activeSale.productTitle}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#9CA3AF]">
              <span>{relativeTime}</span>
              <span className="inline-flex items-center gap-0.5 text-[#6B7280]">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#D1D5DB]">
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
                Verified
              </span>
            </div>
          </div>
        </div>

        <div className="h-[3px] w-full bg-[#E5E7EB]">
          <div
            key={progressKey}
            className={`h-full origin-left bg-[#1D1D1B] ${
              isVisible ? "animate-sales-popup-progress" : ""
            }`}
            style={{
              animationDuration: `${salesPopupConfig.displayDuration}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SalesPopup;
