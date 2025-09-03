"use client";
import React, { useEffect, useState } from "react";
import Text from "@/components/ui/Text";
import { getReviews, Review } from "@/lib/reviews";

type Props = {
  productId?: string;
};

const ReviewsList: React.FC<Props> = ({ productId }) => {
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
    <div className="bg-white rounded-[12px] p-4 divide-y">
      {items.map((r: Review) => (
        <div key={r.id} className="py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-semibold">
              {r.name?.[0]?.toUpperCase() || "N"}
            </div>
            <div>
              <Text className="text-[14px] font-semibold">
                {r.name || "Anonymous"}
              </Text>
              <Text className="text-[12px] text-[#6B6B6B]">Verified Buyer</Text>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={
                      s <= (r.rating || 0) ? "text-yellow-400" : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              <Text className="mt-1 text-[12px] text-[#6B6B6B]">
                Recommended
              </Text>
              <Text className="mt-1 text-[12px] text-[#6B6B6B]">
                {r.message}
              </Text>
            </div>
          </div>
          <Text className="text-[12px] text-[#6B6B6B]">
            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
          </Text>
        </div>
      ))}
      {items.length === 0 && (
        <div className="py-6 text-center">
          <Text className="text-[14px] text-[#6B6B6B]">No reviews yet.</Text>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
