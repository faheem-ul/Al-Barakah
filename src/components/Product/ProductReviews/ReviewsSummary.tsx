"use client";
import React, { useEffect, useState } from "react";
import Text from "@/components/ui/Text";
import { getReviews } from "@/lib/reviews";

interface Props {
  productId: string;
}

const ReviewsSummary: React.FC<Props> = ({ productId }) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getReviews(productId);
        if (mounted) setCount(rows.length || 0);
      } catch {
        if (mounted) setCount(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [productId]);

  return (
    <Text className="text-foreground text-sm">
      5.0 <span className="font-semibold">{count} reviews</span>
    </Text>
  );
};

export default ReviewsSummary;
