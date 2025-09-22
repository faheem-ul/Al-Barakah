"use client";
import React, { useEffect, useState } from "react";

import Text from "@/components/ui/Text";
import { getReviews, Review } from "@/lib/reviews";

import reviewBg from "@/public/images/reviewsbg.png";
// import { cn } from "@/lib/utils";

type Props = {
  productId?: string;
};

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
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url(${reviewBg.src})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
        }}
      />
      {/* Content Layer */}
      <div className="relative z-10 w-full max-w-[1118px] mx-auto px-4">
        {items.map((r: Review, index) => (
          <>
            <div
              key={r.id}
              className="py-10 flex justify-start md:justify-between gap-4 items-center flex-wrap"
            >
              {/* <div className=" w-full md:flex-row flex-col items-center justify-center max-w-[680px] md:justify-between"> */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                  {r.name?.[0]?.toUpperCase() || "N"}
                </div>
                <div>
                  <Text className="text-[24px] font-semibold capitalize">
                    {r.name || "Anonymous"}
                  </Text>
                  <Text className="text-[14px] ">Verified Buyer</Text>
                </div>
              </div>
              <div className="md:pl-0 pl-[50px]">
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
              <Text className="mt-1 text-[15px] w-full max-w-[227px] text-black capitalize font-medium">
                {r.message}
              </Text>
              {/* </div> */}

              <Text className="text-[14px] font-medium">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
              </Text>
            </div>
            {/* <div className="w-full bg-[#000000]/20"></div> */}
            {index !== items.length - 1 && <hr className="opacity-30" />}
          </>
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
