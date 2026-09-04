"use client";

import { splitTitleSegments } from "@/hooks/useProductData";
import { cn } from "@/lib/utils";

export {
  formatComboText,
  getComboContents,
  normalizeContents,
} from "./comboTextFormat";

const WEIGHT_AT_START = /^\([^)]*(?:kg|KG|Kg)[^)]*\)/;

/** Render mixed Urdu/Latin; keep (…) weight labels as LTR so brackets don't flip. */
export const MixedScriptText = ({
  text,
  className,
  lineClassName,
  urduClassName,
  latinClassName,
  align = "center",
}: {
  text: string;
  className?: string;
  lineClassName?: string;
  urduClassName?: string;
  latinClassName?: string;
  align?: "center" | "start";
}) => {
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0);

  return (
    <div className={cn(className)}>
      {lines.map((line, lineIndex) => {
        const chunks = line.split(/(\([^)]*\))/g).filter((c) => c.length > 0);

        return (
          <p
            key={`line-${lineIndex}`}
            className={cn(
              "overflow-visible",
              align === "center" ? "text-center" : "text-start",
              lineIndex > 0 && "mt-0.5",
              WEIGHT_AT_START.test(line) && "whitespace-nowrap",
              lineClassName,
            )}
          >
            {chunks.map((chunk, chunkIndex) => {
              const isParen = /^\([^)]*\)$/.test(chunk);
              const segments = splitTitleSegments(chunk);

              const inner = segments.map((segment, segmentIndex) => (
                <span
                  key={`${lineIndex}-${chunkIndex}-${segmentIndex}`}
                  lang={segment.isUrdu ? "ur" : undefined}
                  className={
                    segment.isUrdu
                      ? cn("font-arabic inline", urduClassName)
                      : cn("font-poppins inline", latinClassName)
                  }
                >
                  {segment.text}
                </span>
              ));

              if (isParen) {
                return (
                  <span
                    key={`${lineIndex}-paren-${chunkIndex}`}
                    dir="ltr"
                    className="inline-block whitespace-nowrap px-0.5"
                    style={{ unicodeBidi: "isolate" }}
                  >
                    {inner}
                  </span>
                );
              }

              return (
                <span key={`${lineIndex}-chunk-${chunkIndex}`}>{inner}</span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};
