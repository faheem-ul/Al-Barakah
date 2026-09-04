"use client";

import { splitTitleSegments } from "@/hooks/useProductData";
import { cn } from "@/lib/utils";

export {
  formatComboText,
  getComboContents,
  normalizeContents,
} from "./comboTextFormat";

const WEIGHT_AT_START = /^\([^)]*(?:kg|KG|Kg)[^)]*\)/;
const WEIGHT_FIRST_LINE =
  /^(\([^)]*(?:kg|KG|Kg)[^)]*\))\s+(.+)$/;

const splitWeightFirstLine = (line: string) => {
  const match = line.match(WEIGHT_FIRST_LINE);
  if (!match) return null;
  return { weight: match[1].trim(), name: match[2].trim() };
};

/** Render mixed Urdu/Latin; keep (…) weight labels as LTR so brackets don't flip. */
export const MixedScriptText = ({
  text,
  className,
  lineClassName,
  urduClassName,
  latinClassName,
  align = "center",
  stackWeightOnMobile = false,
}: {
  text: string;
  className?: string;
  lineClassName?: string;
  urduClassName?: string;
  latinClassName?: string;
  align?: "center" | "start";
  /** Mobile: name on one line, (weight) on the next. Desktop unchanged. */
  stackWeightOnMobile?: boolean;
}) => {
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0);

  const lineClasses = (line: string, lineIndex: number, extra?: string) =>
    cn(
      "min-w-0 max-w-full break-words md:overflow-visible",
      align === "center" ? "text-center" : "text-start",
      lineIndex > 0 && "mt-0.5",
      WEIGHT_AT_START.test(line) && "md:whitespace-nowrap",
      lineClassName,
      extra,
    );

  const renderLineContent = (
    line: string,
    lineIndex: number,
    keyPrefix: string,
  ) => {
    const chunks = line.split(/(\([^)]*\))/g).filter((c) => c.length > 0);

    return chunks.map((chunk, chunkIndex) => {
      const isParen = /^\([^)]*\)$/.test(chunk);
      const segments = splitTitleSegments(chunk);

      const inner = segments.map((segment, segmentIndex) => (
        <span
          key={`${keyPrefix}-${chunkIndex}-${segmentIndex}`}
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
            key={`${keyPrefix}-paren-${chunkIndex}`}
            dir="ltr"
            className="inline-block whitespace-nowrap px-0.5"
            style={{ unicodeBidi: "isolate" }}
          >
            {inner}
          </span>
        );
      }

      return <span key={`${keyPrefix}-chunk-${chunkIndex}`}>{inner}</span>;
    });
  };

  return (
    <div className={cn("min-w-0 max-w-full", className)}>
      {lines.map((line, lineIndex) => {
        const stacked =
          stackWeightOnMobile && WEIGHT_AT_START.test(line)
            ? splitWeightFirstLine(line)
            : null;

        if (stacked) {
          return (
            <div key={`line-${lineIndex}`}>
              <div className="md:hidden">
                <p className={lineClasses(stacked.name, lineIndex)}>
                  {renderLineContent(stacked.name, lineIndex, `m-name-${lineIndex}`)}
                </p>
                <p
                  className={lineClasses(
                    stacked.weight,
                    lineIndex,
                    "mt-0",
                  )}
                >
                  {renderLineContent(
                    stacked.weight,
                    lineIndex,
                    `m-weight-${lineIndex}`,
                  )}
                </p>
              </div>
              <p
                className={cn(
                  lineClasses(line, lineIndex),
                  "hidden md:block",
                )}
              >
                {renderLineContent(line, lineIndex, `d-${lineIndex}`)}
              </p>
            </div>
          );
        }

        return (
          <p key={`line-${lineIndex}`} className={lineClasses(line, lineIndex)}>
            {renderLineContent(line, lineIndex, `line-${lineIndex}`)}
          </p>
        );
      })}
    </div>
  );
};
