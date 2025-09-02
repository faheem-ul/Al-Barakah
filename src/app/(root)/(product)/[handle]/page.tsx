import { getProductByHandle } from "@/lib/shopify/actions/product";
import { Metadata } from "next";
import React from "react";

import { Product } from "@/lib/shopify/types";
import ProductDetails from "@/components/Product";
import ProductTabs from "@/components/Product/ProductTabs";
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
  const product = await getProductByHandle(handle);

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
    </div>
  );
};

export default MealDetailPage;
