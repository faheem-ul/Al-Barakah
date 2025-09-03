import { getProductByHandle } from "@/lib/shopify/actions/product";
import { toEnglishSlugFromTitle } from "@/lib/utils";
import { Metadata } from "next";
import React from "react";

import { Product } from "@/lib/shopify/types";
import ProductDetails from "@/components/Product";
import ProductTabs from "@/components/Product/ProductTabs";
import ProductReviews from "@/components/Product/ProductReviews";
import Text from "@/ui/Text";

export const metadata: Metadata = {
  title: "AlBarakah Shop",
  description: "AlBarakah Shop market place",
};

interface Props {
  params: Promise<{
    handle: string;
  }>;
}

const MealDetailPage = async ({ params }: Props) => {
  const { handle } = await params;
  // Try fetching by Shopify handle first
  let product = await getProductByHandle(handle);

  // Fallback: if not found, treat handle as English slug derived from title; try to find a product whose slug matches
  if (!product.success) {
    // This fallback requires fetching a list to map titles → slugs; keep it small (e.g., first 200)
    // Reuse getProducts to avoid extra endpoint creation
    const { getProducts } = await import("@/lib/shopify/actions/product");
    const all = await getProducts({ first: 200 });
    if (all.success && Array.isArray(all.data)) {
      const products = all.data as Product[];
      const match = products.find(
        (p: Product) => toEnglishSlugFromTitle(p.title) === handle
      );
      if (match) {
        product = { success: true, data: match, error: null } as const;
      }
    }
  }

  if (!product.success) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Text as="h2">Product Not Found</Text>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] ">
      <ProductDetails product={product.data as Product} />

      {/* Product description and reviews tabs */}
      <ProductTabs product={product.data as Product} />
      <ProductReviews productId={product.data?.id} />
    </div>
  );
};

export default MealDetailPage;
