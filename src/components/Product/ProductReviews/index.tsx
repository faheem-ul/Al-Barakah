"use client";
import React, { useEffect, useRef, useState } from "react";

import Text from "@/components/ui/Text";
import { getReviews, Review } from "@/lib/reviews";
import { cn } from "@/lib/utils";

import reviewBgDesktop from "@/public/images/reviewsbg.webp";
import reviewBgMob from "@/public/images/reviewsbg-mob.webp";

type Props = {
  productId?: string;
};

function ReviewMessage({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const checkOverflow = () => {
      if (expanded) return;
      setNeedsClamp(el.scrollHeight > el.clientHeight + 1);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [message, expanded]);

  return (
    <div className="w-full min-w-0 md:max-w-[227px]">
      <Text
        ref={ref}
        className={cn(
          "mt-1 text-[15px] text-black capitalize font-medium",
          !expanded && "line-clamp-3",
        )}
      >
        {message}
      </Text>
      {(needsClamp || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[14px] font-medium cursor-pointer text-black underline underline-offset-2"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

const ProductReviews: React.FC<Props> = ({ productId }) => {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getReviews(productId);
        if (mounted) setItems(data);
      } catch (e) {
        console.error("Failed to load reviews", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading) return null;

  return (
    <div className="relative w-full bg-white/90">
      {/* Background Image Layer Desktop */}
      <div
        className="absolute inset-0 opacity-10 hidden md:block"
        style={{
          backgroundImage: `url(${reviewBgDesktop.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

       {/* Background Image Layer Mobile */}
       <div
        className="absolute inset-0 opacity-10 block md:hidden"
        style={{
          backgroundImage: `url(${reviewBgMob.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 w-full max-w-[1118px] mx-auto px-4">
        {items.map((r: Review, index) => (
          <React.Fragment key={r.id}>
            <div className="py-10 grid grid-cols-1 md:grid-cols-[minmax(0,260px)_160px_minmax(0,227px)_100px] md:justify-between gap-4 items-center">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                  {r.name?.[0]?.toUpperCase() || "N"}
                </div>
                <div className="min-w-0 flex-1" title={r.name || "Anonymous"}>
                  <Text className="text-[24px] font-semibold capitalize truncate">
                    {r.name || "Anonymous"}
                  </Text>
                  <Text className="text-[14px] ">Verified Buyer</Text>
                </div>
              </div>
              <div className="md:pl-0 pl-[50px] shrink-0">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={
                        s <= (r.rating || 0)
                          ? "text-yellow-400 text-[20px]"
                          : "text-gray-300 text-[20px]"
                      }
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-[12px] font-medium text-black">
                    ({r.rating || 0}/5)
                  </span>
                </div>
                <Text className="mt-1 text-[14px] font-medium">
                  Recommended
                </Text>
              </div>
              <ReviewMessage message={r.message} />
              <Text className="text-[14px] font-medium md:justify-self-end shrink-0 whitespace-nowrap">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
              </Text>
            </div>
            {/* <div className="w-full bg-[#000000]/20"></div> */}
            {index !== items.length - 1 && <hr className="opacity-30" />}
          </React.Fragment>
        ))}
        {items.length === 0 && (
          <div className="py-6 text-center mx-auto w-full">
            <Text className="text-[14px] text-[#6B6B6B] text-center mx-auto">
              No reviews yet.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
