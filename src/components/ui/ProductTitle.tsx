import React from "react";

import Text from "@/ui/Text";
import { cn } from "@/lib/utils";
import { TitleSegment, splitTitleSegments } from "@/hooks/useProductData";

const WEIGHT_PART_REGEX = /(\(\s*[^)]*kg\s*\))/i;

interface PropTypes {
  urduTitle: string;
  englishTitle: string;
  isInterleavedTitle: boolean;
  titleSegments: TitleSegment[];
  urduClassName?: string;
  englishClassName?: string;
  mixedClassName?: string;
  /** Applied to "( … kg )" weight labels only (e.g. Azadi Sale text-[17px]) */
  weightClassName?: string;
}

const MixedTitleLine = ({
  text,
  className,
  weightClassName,
}: {
  text: string;
  className?: string;
  weightClassName?: string;
}) => (
  <Text className={cn(className)}>
    {splitTitleSegments(text).flatMap((segment, index) => {
      if (segment.isUrdu) {
        return (
          <span
            key={`${index}-${segment.text}`}
            className="font-arabic"
          >
            {segment.text}
          </span>
        );
      }

      if (!weightClassName) {
        return (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        );
      }

      return segment.text
        .split(WEIGHT_PART_REGEX)
        .filter((part) => part.length > 0)
        .map((part, partIndex) => {
          const isWeight = /^\(\s*[^)]*kg\s*\)$/i.test(part);
          return (
            <span
              key={`${index}-${partIndex}-${part}`}
              className={isWeight ? weightClassName : undefined}
            >
              {part}
            </span>
          );
        });
    })}
  </Text>
);

const ProductTitle = (props: PropTypes) => {
  const {
    urduTitle,
    englishTitle,
    isInterleavedTitle,
    titleSegments,
    urduClassName,
    englishClassName,
    mixedClassName,
    weightClassName,
  } = props;

  if (isInterleavedTitle) {
    const fullTitle = titleSegments.map((segment) => segment.text).join("");

    let comboParts = fullTitle
      .split(/\s*\+\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (comboParts.length !== 2) {
      comboParts = fullTitle
        .split(/(?=\(\s*[^)]*kg\s*\))/i)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    if (comboParts.length === 2) {
      return (
        <div className="flex w-full flex-col gap-0.5">
          <MixedTitleLine
            text={comboParts[0]}
            className={cn(mixedClassName, "mb-0")}
            weightClassName={weightClassName}
          />
          <MixedTitleLine
            text={comboParts[1]}
            className={cn(mixedClassName, "mt-0")}
            weightClassName={weightClassName}
          />
        </div>
      );
    }

    return (
      <MixedTitleLine
        text={fullTitle}
        className={mixedClassName}
        weightClassName={weightClassName}
      />
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
