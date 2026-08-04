import { Product } from "@/lib/shopify/types";

const URDU_RUN_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
const URDU_BLOCK_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+/;

export type TitleSegment = {
  text: string;
  isUrdu: boolean;
};

interface ProcessedProductData {
  name: string;
  image: string;
  hoverImage: string;
  sizes: string[];
  currentPrice: string;
  comparePrice: string;
  discountPercentage: number;
  urduTitle: string;
  englishTitle: string;
  /** True when Latin/Urdu alternate (e.g. "½ KG بڑی مکھی + ½ KG چھوٹی مکھی") */
  isInterleavedTitle: boolean;
  titleSegments: TitleSegment[];
  formatPrice: (priceAmount: string) => string;
}

export const splitTitleSegments = (title: string): TitleSegment[] => {
  return title
    .split(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)/)
    .filter((part) => part.length > 0)
    .map((text) => ({
      text,
      isUrdu: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text),
    }));
};

export const isInterleavedProductTitle = (title: string): boolean => {
  const latinRuns = title
    .split(URDU_RUN_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

  // More than one non-Urdu chunk means English/numbers wrap around Urdu (interleaved)
  return latinRuns.length > 1;
};

export const separateTitle = (title: string) => {
  if (isInterleavedProductTitle(title)) {
    return { urdu: "", english: title };
  }

  const match = title.match(URDU_BLOCK_REGEX);

  if (match) {
    const urduPart = match[0].trim();
    if (!urduPart || !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(urduPart)) {
      return { urdu: "", english: title };
    }
    const englishPart = title.replace(urduPart, "").trim();
    return { urdu: urduPart, english: englishPart };
  }

  return { urdu: "", english: title };
};

export const useProductData = (product: Product): ProcessedProductData => {
  const formatPrice = (priceAmount: string) => {
    const numericValue = parseFloat(priceAmount);
    const formatted = numericValue.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatted.replace(/\.00$/, "");
  };

  const calculateDiscountPercentage = (
    currentPrice: string,
    comparePrice: string
  ) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);

    if (compare <= 0 || current >= compare) {
      return 0;
    }

    const discount = ((compare - current) / compare) * 100;
    return Math.round(discount);
  };

  const name = product.title;
  const currentPrice = product.priceRange.minVariantPrice.amount;
  const comparePrice = product.compareAtPriceRange.maxVariantPrice.amount;
  const image = product.featuredImage?.url || "/images/placeholder.png";
  const hoverImage = product.images?.[1]?.url || image;
  const sizes =
    product.options.find((option) => option.name.toLowerCase() === "size")
      ?.values || [];

  const discountPercentage = calculateDiscountPercentage(
    currentPrice,
    comparePrice
  );
  const interleaved = isInterleavedProductTitle(name);
  const { urdu: urduTitle, english: englishTitle } = separateTitle(name);
  const titleSegments = splitTitleSegments(name);

  return {
    name,
    image,
    hoverImage,
    sizes,
    currentPrice,
    comparePrice,
    discountPercentage,
    urduTitle,
    englishTitle,
    isInterleavedTitle: interleaved,
    titleSegments,
    formatPrice,
  };
};
