import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const stringifyLog = (message: string, data: any) =>
  console.log(message, JSON.stringify(data, null, 4));

export const calculatePercentageOff = (
  price: string,
  compareAtPrice: string | null | undefined
): number => {
  if (compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price)) {
    const discount = parseFloat(compareAtPrice) - parseFloat(price);
    const percentage = (discount / parseFloat(compareAtPrice)) * 100;
    return Math.round(percentage);
  }
  return 0;
};

export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Helper function to determine if a color is light or dark
export const isColorLight = (hexColor: string): boolean => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    // Default to light if color can't be parsed
    return true;
  }

  // Calculate luminance (perceived brightness)
  // Formula: L = 0.2126*R + 0.7152*G + 0.0722*B (for sRGB)
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;

  // You can adjust this threshold (0.5) based on what you consider "light" or "dark"
  return luminance > 0.5;
};

// Extract English portion from a mixed Urdu/English title and slugify it
export const toEnglishSlugFromTitle = (title: string): string => {
  if (!title) return "";
  const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+/g;
  const englishPart = title.replace(urduRegex, " ").trim();
  const slug = englishPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
};
