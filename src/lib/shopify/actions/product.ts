import { shopifyFetch } from "@/lib/shopify";
// import { stringifyLog } from "@/lib/utils";
import {
  removeEdgesAndNodes,
  reshapeProduct,
  reshapeProducts,
  reshapeCollection,
} from "@/lib/utils/shopify";

import {
  getProductsQuery,
  getProductByHandleQuery,
  getProductsByMetafieldQuery,
  getCartProductsQuery,
  getProductsByProductTypeQuery,
  getProductsByHandlesQuery,
  getMetaObjectValuesQuery,
  getProductByIdQuery,
} from "../queries/product";
import {
  Product,
  ShopifyProductsOperation,
  ApiResponse,
  ShopifyProductOperation,
  ShopifyProductsByCollectionOperation,
  ShopifyCartProductsOperation,
  ShopifyProductsByTypeOperation,
  ShopifyProductsByHandlesOperation,
  ShopifyMetaObject,
  ShopifyMetaObjectOperation,
} from "../types";

export const getProducts = async ({
  query,
  reverse,
  sortKey,
  first, // Add the 'first' parameter to handle the query filter for first (num of products to fetch)
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
  first?: number;
}): Promise<ApiResponse<Product[]>> => {
  try {
    const res = await shopifyFetch<ShopifyProductsOperation>({
      query: getProductsQuery,
      cache: "no-cache",
      variables: {
        query,
        reverse,
        sortKey,
        first: first || 200, // Use the 'first' parameter or default to 200
      },
    });

    return {
      data: reshapeProducts(removeEdgesAndNodes(res.body.data.products)),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Products fetch error", err);
    return { success: false, data: null, error: err };
  }
};

export const getProductsByMetafield = async ({
  query,
  reverse,
  sortKey,
  category,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
  category: string;
}): Promise<ApiResponse<Product[]>> => {
  try {
    const res = await shopifyFetch<ShopifyProductsByCollectionOperation>({
      query: getProductsByMetafieldQuery,
      variables: {
        query,
        reverse,
        sortKey,
        category,
      },
    });

    return {
      data: reshapeProducts(
        removeEdgesAndNodes(res.body.data.collection.products),
      ),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Products by metadata fetch error", err);
    return { success: false, data: null, error: err };
  }
};

export const getProductByHandle = async (
  handle: string,
): Promise<ApiResponse<Product | undefined>> => {
  try {
    const res = await shopifyFetch<ShopifyProductOperation>({
      query: getProductByHandleQuery,
      cache: "no-cache",
      variables: {
        handle,
      },
    });

    if (reshapeProduct(res.body.data.product, false) === undefined) {
      return {
        success: false,
        data: null,
        error: { message: "Product not found" },
      };
    }

    return {
      data: reshapeProduct(res.body.data.product, false),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Product by handle fetch error", err);
    return { success: false, data: null, error: err };
  }
};

export const getProductByID = async (
  id: string,
): Promise<ApiResponse<Product | undefined>> => {
  try {
    const res = await shopifyFetch<ShopifyProductOperation>({
      query: getProductByIdQuery,
      cache: "no-cache",
      variables: {
        handle: id,
      },
    });

    if (reshapeProduct(res.body.data.product, false) === undefined) {
      return {
        success: false,
        data: null,
        error: { message: "Product not found" },
      };
    }

    return {
      data: reshapeProduct(res.body.data.product, false),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Product by handle fetch error", err);
    return { success: false, data: null, error: err };
  }
};

// * Multiple Products By Handle
export const getProductsByHandles = async (
  handles: string,
): Promise<ApiResponse<Product[] | undefined>> => {
  try {
    const res = await shopifyFetch<ShopifyProductsByHandlesOperation>({
      query: getProductsByHandlesQuery,
      variables: {
        handles,
      },
    });

    if (
      reshapeProducts(removeEdgesAndNodes(res.body.data.products)) === undefined
    ) {
      return {
        success: false,
        data: null,
        error: { message: "Product not found" },
      };
    }

    return {
      data: reshapeProducts(removeEdgesAndNodes(res.body.data.products)),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Product by handle fetch error", err);
    return { success: false, data: null, error: err };
  }
};

export async function getCartProducts(
  productIds: string[],
): Promise<ApiResponse<Product[] | undefined>> {
  const res = await shopifyFetch<ShopifyCartProductsOperation>({
    query: getCartProductsQuery,

    cache: "no-store",
    variables: {
      productIds,
    },
  });
  try {
    // @ts-expect-error any
    const nodes = res.body.data.nodes;

    const reshapedProducts = reshapeProducts(nodes);

    // console.log("reshapedProducts", reshapedProducts);

    return {
      data: reshapedProducts,
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Cart Product fetch error", err);

    return { success: false, data: null, error: err };
  }
}

export const getProductsByProductType = async ({
  query,
  reverse,
  sortKey,
  productType,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
  productType: string;
}): Promise<ApiResponse<Product[]>> => {
  try {
    const res = await shopifyFetch<ShopifyProductsByTypeOperation>({
      query: getProductsByProductTypeQuery,
      variables: {
        query,
        reverse,
        sortKey,
        productType,
      },
    });

    return {
      data: reshapeCollection(res.body.data),
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("Products by metadata fetch error", err);
    return { success: false, data: null, error: err };
  }
};

export const getProductMetaObject = async (
  id: string,
): Promise<ApiResponse<ShopifyMetaObject>> => {
  try {
    const res = await shopifyFetch<ShopifyMetaObjectOperation>({
      query: getMetaObjectValuesQuery,
      variables: {
        id,
      },
    });

    return {
      data: res.body.data.metaobject,
      success: true,
      error: null,
    };
  } catch (err) {
    console.log("meta object data fetch error", err);
    return { success: false, data: null, error: err };
  }
};
