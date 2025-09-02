import { Product } from "@/lib/shopify/types";

interface ProcessedProductData {
  // Basic info
  name: string;
  image: string;
  hoverImage: string;
  sizes: string[];
  
  // Prices
  currentPrice: string;
  comparePrice: string;
  discountPercentage: number;
  
  // Title separation
  urduTitle: string;
  englishTitle: string;
  
  // Helper functions
  formatPrice: (priceAmount: string) => string;
}

export const useProductData = (product: Product): ProcessedProductData => {
  // Format price without currency symbol
  const formatPrice = (priceAmount: string) => {
    const numericValue = parseFloat(priceAmount);
    const formatted = numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    // Remove .00 if the price is a whole number
    return formatted.replace(/\.00$/, '');
  };

  // Calculate discount percentage
  const calculateDiscountPercentage = (currentPrice: string, comparePrice: string) => {
    const current = parseFloat(currentPrice);
    const compare = parseFloat(comparePrice);
    
    if (compare <= 0 || current >= compare) {
      return 0; // No discount or invalid prices
    }
    
    const discount = ((compare - current) / compare) * 100;
    return Math.round(discount); // Round to nearest whole number
  };

  // Separate Urdu and English text from title
  const separateTitle = (title: string) => {
    // Urdu characters range: \u0600-\u06FF (Arabic), \u0750-\u077F (Arabic Supplement), \u08A0-\u08FF (Arabic Extended-A)
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+/;
    const match = title.match(urduRegex);
    
    if (match) {
      const urduPart = match[0].trim();
      const englishPart = title.replace(urduPart, '').trim();
      return { urdu: urduPart, english: englishPart };
    }
    
    // If no Urdu text found, return the whole title as English
    return { urdu: '', english: title };
  };

  // Extract and process data
  const name = product.title;
  const currentPrice = product.priceRange.minVariantPrice.amount;
  const comparePrice = product.compareAtPriceRange.maxVariantPrice.amount;
  const image = product.featuredImage?.url || "/images/placeholder.png";
  const hoverImage = product.images?.[1]?.url || image; // Get second image for hover effect
  const sizes = product.options.find((option) => option.name.toLowerCase() === "size")?.values || [];
  
  const discountPercentage = calculateDiscountPercentage(currentPrice, comparePrice);
  const { urdu: urduTitle, english: englishTitle } = separateTitle(name);

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
    formatPrice
  };
};
