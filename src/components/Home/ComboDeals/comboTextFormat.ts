import { Product } from "@/lib/shopify/types";

const WEIGHT_PAREN = /\([^)]*(?:kg|KG|Kg)[^)]*\)/g;
const WEIGHT_AT_START = /^\([^)]*(?:kg|KG|Kg)[^)]*\)/;
const WEIGHT_SPLIT = /(?=\([^)]*(?:kg|KG|Kg)[^)]*\))/;

export const normalizeContents = (raw: string) =>
  raw
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    // "( kg 1/2 … )" → "(1/2 kg … )" so Latin stays LTR-friendly
    .replace(/\(\s*kg\s*(1\s*\/\s*2|0\.5)\s+/gi, "(1/2 kg ")
    .replace(/\(\s*kg\s+(\d+(?:\.\d+)?)\s+/gi, "($1 kg ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Force layout:
 *   line 1 — product name (Urdu / Latin)
 *   line 2 — weight label like "(1/2 kg ہر ایک)"
 * If Shopify put weight in the middle, Urdu after the (…) is pulled back onto line 1.
 */
const splitNameAndWeight = (raw: string) => {
  const normalized = normalizeContents(raw);
  if (!normalized) return "";

  const match = normalized.match(
    /^(.*?)\s*(\([^)]*(?:kg|KG|Kg)[^)]*\))\s*(.*)$/,
  );
  if (!match) return normalized;

  const before = match[1].trim();
  const weight = match[2].trim();
  const after = match[3].trim();
  const name = [before, after].filter(Boolean).join(" ").trim();

  if (!name) return weight;
  return `${name}\n${weight}`;
};

/**
 * Preferred Mix layout (one honey + weight per line):
 *   (1kg) بڑی مکھی کا جنگلی شہد
 *   (1/2kg) چھوٹی مکھی کا جنگلی شہد
 */
export const formatComboText = (raw: string) => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) =>
      normalizeContents(line)
        .replace(/\s*\+\s*$/g, "")
        .trim(),
    )
    .filter(Boolean);

  if (!lines.length) return "";

  const startsWithWeight = lines.filter((l) => WEIGHT_AT_START.test(l));

  // Multiple "(weight) name" lines from Shopify — keep exactly as lines
  if (
    startsWithWeight.length >= 2 ||
    (lines.length >= 2 && WEIGHT_AT_START.test(lines[0]))
  ) {
    return lines.join("\n");
  }

  // Name on line 1, "(weight)" alone on line 2
  if (lines.length >= 2 && /^\([^)]*\)$/.test(lines[1])) {
    return splitNameAndWeight(`${lines[0]} ${lines[1]}`);
  }

  const joined = lines.join(" ");
  const weightMatches = joined.match(WEIGHT_PAREN) || [];

  // One string with several weights — split into one line per weight block
  if (weightMatches.length >= 2) {
    return joined
      .split(WEIGHT_SPLIT)
      .map((part) => part.replace(/\s*\+\s*/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }

  return splitNameAndWeight(joined);
};

export const getComboContents = (product: Product) => {
  const raw = product.description || product.title || "";
  return formatComboText(raw);
};

/** Split formatted combo text into checkout-friendly lines. */
export const getComboDescriptionLines = (description: string) =>
  formatComboText(description)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
