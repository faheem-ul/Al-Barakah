import _flatten from "lodash/flatten";
import {
  Connection,
  ShopifyProduct,
  Image,
  ShopifyCollection,
  CustomerOrder,
  Product,
  ProductVariant,
  PriceFormatOptions,
} from "../shopify/types";

// export const reshapeCollection = (
//   collection: ShopifyCollection,
//   filterHiddenProducts: boolean = false,
// ) => {
//   if (!collection || filterHiddenProducts) {
//     return undefined;
//   }

//   const { products, ...rest } = collection;

//   return {
//     ...rest,
//     products: removeEdgesAndNodes(products).map(
//       (productEdge: ShopifyProductEdge) => {
//         const { node: product } = productEdge;
//         const { images, variants, ...restProduct } = product;

//         return {
//           ...restProduct,
//           images: reshapeImages(images, product.title),
//           variants: removeEdgesAndNodes(variants),
//         };
//       },
//     ),
//   };
// };

export const reshapeCollection = (
  data: ShopifyCollection
  // filterHiddenProducts: boolean = false,
) => {
  const reshapedPrdoucts = data.collections.nodes.map((node) =>
    reshapeProducts(removeEdgesAndNodes(node.products))
  );

  return _flatten(reshapedPrdoucts);
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const removeEdgesAndNodes = (array: Connection<any>) => {
  return array.edges.map((edge) => edge?.node);
};

export const reshapeImages = (
  images: Connection<Image>,
  productTitle: string
) => {
  const flattened = removeEdgesAndNodes(images);

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)[1];
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`,
    };
  });
};

export const reshapeProduct = (
  product: ShopifyProduct,
  filterHiddenProducts: boolean = false
) => {
  if (!product || filterHiddenProducts) {
    return undefined;
  }

  const { images, variants, ...rest } = product;

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants),
  };
};

export const reshapeProducts = (products: ShopifyProduct[]) => {
  const reshapedProducts = [];

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product);

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct);
      }
    }
  }

  return reshapedProducts;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const reshadeCustomerOrders = (orders: any): CustomerOrder[] => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return orders.edges.flatMap((orderEdge: any) =>
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    orderEdge.node.lineItems.edges.map((lineItemEdge: any) => ({
      title: lineItemEdge.node.title,
      image: {
        id: lineItemEdge.node.variant.image.id,
        altText: lineItemEdge.node.variant.image.altText,
        url: lineItemEdge.node.variant.image.url,
      },
      quantity: lineItemEdge.node.quantity,
      originalTotalPrice: {
        amount: lineItemEdge.node.originalTotalPrice.amount,
        currencyCode: lineItemEdge.node.originalTotalPrice.currencyCode,
      },
    }))
  );
};

/**
 * Checks if a specific option value (like a size or color) for a product has any available variants.
 * This is useful for displaying if a general option (e.g., "Red" or "Small") is available at all,
 * regardless of other option combinations.
 * @param product The reshaped Product object.
 * @param optionName The name of the option to check (e.g., "Size", "Color"). Case-insensitive.
 * @param optionValue The specific value of the option (e.g., "S", "Arctic Wolf").
 * @returns True if at least one variant that includes the given option value is availableForSale, false otherwise.
 */
export const isOptionAvailable = (
  product: Product,
  optionName: "size" | "color",
  optionValue: string
): boolean => {
  // Ensure product and variants data exist
  if (!product || !product.variants || product.variants.length === 0) {
    return false;
  }

  const normalizedOptionName = optionName.toLowerCase();

  // Check if any variant has the specified option value AND is available for sale
  return product.variants.some((variant: ProductVariant) => {
    return (
      variant.availableForSale &&
      variant.selectedOptions.some(
        (option) =>
          option.name.toLowerCase() === normalizedOptionName &&
          option.value === optionValue
      )
    );
  });
};

/**
 * Checks if a specific combination of selected options (e.g., a particular size AND color) variant is available.
 * This is useful when the user has chosen specific options and you need to check if that exact variant exists and is in stock.
 * @param product The reshaped Product object.
 * @param selectedOptions An array of objects representing the selected options (e.g., [{ name: "Size", value: "M" }, { name: "Color", value: "Blue" }]).
 * @returns True if the specific variant combination is availableForSale, false otherwise.
 */
export const isCombinationAvailable = (
  product: Product,
  selectedOptions: { name: string; value: string }[]
): boolean => {
  // Ensure product and variants data exist
  if (!product || !product.variants || product.variants.length === 0) {
    return false;
  }

  // Find the exact variant matching all selected options
  const variant = product.variants.find((v: ProductVariant) => {
    // Check if every selected option matches one of the variant's selected options
    return selectedOptions.every((selectedOpt) => {
      const normalizedSelectedOptName = selectedOpt.name.toLowerCase();
      return v.selectedOptions.some(
        (variantOpt) =>
          variantOpt.name.toLowerCase() === normalizedSelectedOptName &&
          variantOpt.value === selectedOpt.value
      );
    });
  });

  // Return true if a matching variant is found and it's availableForSale
  return variant?.availableForSale || false;
};

/**
 * Formats a given value (number or string) into a currency string with two decimal places.
 * Defaults to 'en-US' locale and 'USD' currency if not specified.
 *
 * @param value The number or string value to format.
 * @param options Optional formatting options.
 * @returns The formatted price string.
 */
export function formatPrice(
  value: number | string,
  options?: PriceFormatOptions
): string {
  // Ensure the value is a number
  const numericValue = parseFloat(String(value));

  // Handle invalid numbers gracefully (e.g., return a default or throw an error)
  if (isNaN(numericValue)) {
    console.warn(`formatPrice received an invalid number: Rs. {value}`);
    return "$0.00"; // Or throw new Error("Invalid price value");
  }

  const defaultOptions: PriceFormatOptions = {
    locale: "en-US", // Default locale
    currency: "PKR", // Default currency for the symbol
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // If currency is provided, use 'currency' style, otherwise use 'decimal'
  const style = mergedOptions.currency ? "currency" : "decimal";

  try {
    const formatter = new Intl.NumberFormat(mergedOptions.locale, {
      style: style,
      currency: mergedOptions.currency, // Only applies if style is 'currency'
      minimumFractionDigits: mergedOptions.minimumFractionDigits,
      maximumFractionDigits: mergedOptions.maximumFractionDigits,
      // Add other options as needed, e.g., useGrouping: true/false
    });

    // If style is 'currency', Intl.NumberFormat will add the currency symbol.
    // If style is 'decimal', we will prepend the symbol manually if desired.
    if (style === "currency") {
      return formatter.format(numericValue);
    } else {
      // If we're just formatting as a decimal and want a symbol, prepend it.
      // This part might need adjustment based on where you want the symbol
      // and which symbol you explicitly want (e.g., if currency code is PKT but you want '$')
      const formattedDecimal = formatter.format(numericValue);
      // For your specific case ($26.00), you explicitly want '$'
      return `$${formattedDecimal}`;
    }
  } catch (error) {
    console.error(`Error formatting price ${value}:`, error);
    // Fallback to a simpler formatting or throw
    return `$${numericValue.toFixed(2)}`;
  }
}
