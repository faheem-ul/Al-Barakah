import React from "react";

import Text from "@/ui/Text";
import { cn } from "@/lib/utils";
import { TitleSegment } from "@/hooks/useProductData";

interface PropTypes {
  urduTitle: string;
  englishTitle: string;
  isInterleavedTitle: boolean;
  titleSegments: TitleSegment[];
  urduClassName?: string;
  englishClassName?: string;
  mixedClassName?: string;
}

const ProductTitle = (props: PropTypes) => {
  const {
    urduTitle,
    englishTitle,
    isInterleavedTitle,
    titleSegments,
    urduClassName,
    englishClassName,
    mixedClassName,
  } = props;

  if (isInterleavedTitle) {
    return (
      <Text className={cn(mixedClassName)}>
        {titleSegments.map((segment, index) => (
          <span
            key={`${index}-${segment.text}`}
            className={segment.isUrdu ? "font-arabic" : undefined}
          >
            {segment.text}
          </span>
        ))}
      </Text>
    );
  }

  return (
    <>
      {urduTitle ? (
        <Text className={cn(urduClassName)}>{urduTitle}</Text>
      ) : null}
      {englishTitle ? (
        <Text className={cn(englishClassName)}>{englishTitle}</Text>
      ) : null}
    </>
  );
};

export default ProductTitle;
