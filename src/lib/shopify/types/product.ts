export type Edge<T> = {
  node: T;
};

export type Connection<T> = {
  edges: Array<Edge<T>>;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  price: Money;
  compareAtPrice?: Money;
};

export type Image = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

export type SEO = {
  title: string;
  description: string;
};

export type MetaField = {
  id: string;
  key: string;
  value: string;
  namespace: string;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  availableForSale: boolean;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  options: ProductOption[];
  priceRange: {
    maxVariantPrice: Money;
    minVariantPrice: Money;
  };
  compareAtPriceRange: {
    maxVariantPrice: Money;
    minVariantPrice: Money;
  };
  variants: Connection<ProductVariant>;
  featuredImage: Image;
  images: Connection<Image>;
  seo: SEO;
  tags: string[];
  updatedAt: string;
  metafields: MetaField[];
};

export type ProductNutritionFacts = {
  calories: string;
  dietary_fiber: string;
  dietary_fiber_daily_value: string;
  protein: string;
  protein_daily_value: string;
  saturated_fat: string;
  saturated_fat_daily_value: string;
  serving_size: string;
  servings_per_container: string;
  sodium: string;
  sodium_daily_value: string;
  total_carbohydrate: string;
  total_carbohydrate_daily_value: string;
  total_fat: string;
  total_fat_daily_value: string;
  total_sugars: string;
  trans_fat: string;
  added_sugar: string;
  added_sugar_value: string;
};

export type ShopifyProductsOperation = {
  data: {
    products: Connection<ShopifyProduct>;
  };
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
    first?: number;
  };
};

export type ShopifyMetaObject = {
  id: string;
  handle: string;
  fields: ShopifyMetaObjectField[];
};

export type ShopifyMetaObjectField = {
  value: string;
  key: string;
  type: string; // e.g. "single_line_text_field"
};

export type ShopifyMetaObjectOperation = {
  data: {
    metaobject: ShopifyMetaObject;
  };
  variables: {
    id: string; // meta object ID
  };
};

export type ShopifyProductsByHandlesOperation = {
  data: {
    products: Connection<ShopifyProduct>;
  };
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
    handles: string;
  };
};

export type ShopifyCartProductsOperation = {
  data: {
    products: Connection<ShopifyProduct>;
  };

  variables: {
    productIds: string[];
  };
};

export type ShopifyProductsByCollectionOperation = {
  data: {
    collection: { products: Connection<ShopifyProduct> };
  };
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
    category: string;
  };
};

// export type ShopifyProductsByTypeOperation = {
//   data: {
//     collections: {
//       nodes: { products: Connection<ShopifyProduct>; handle: string }[];
//     };
//   };
//   variables: {
//     query?: string;
//     reverse?: boolean;
//     sortKey?: string;
//     productType: string;
//   };
// };

export type ShopifyProductsByTypeOperation = {
  data: ShopifyCollection;
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
    productType: string;
  };
};

export type ShopifyProductOperation = {
  data: { product: ShopifyProduct };
  variables: {
    handle: string;
  };
};

export type Product = Omit<ShopifyProduct, "variants" | "images"> & {
  variants: ProductVariant[];
  images: Image[];
};

export type ShopifyCollection = {
  collections: {
    nodes: Array<{
      handle: string;
      products: {
        edges: Array<{
          node: ShopifyProduct;
        }>;
      };
    }>;
  };
};
export type ShopifyProductEdge = Edge<ShopifyProduct>;

export interface PriceFormatOptions {
  locale?: string; // e.g., 'en-US', 'de-DE'
  currency?: string; // e.g., 'USD', 'EUR', 'PKR'
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  // Add more Intl.NumberFormat options if needed
}
