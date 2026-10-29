import ProductDetails from "@/components/Product";
import ProductHeroImage from "@/components/Product/ProductHeroImage";
import { isAzadiSaleProduct } from "@/components/Product/productAzadiSale";
import ProductReviews from "@/components/Product/ProductReviews";
import ProductTabs from "@/components/Product/ProductTabs";
import ProductSchema from "@/components/seo/ProductSchema";
import { buildProductPageMetadata } from "@/lib/seo/product-metadata";
import { siteSlugFromProduct } from "@/lib/seo/product-schema";
import { resolveProductByPathSegment } from "@/lib/seo/resolve-product-by-path";
import type { Product } from "@/lib/shopify/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

interface Props {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await resolveProductByPathSegment(handle);
  if (!product) {
    notFound();
  }

  return buildProductPageMetadata(product);
}

const MealDetailPage = async ({ params }: Props) => {
  const { handle } = await params;
  const product = await resolveProductByPathSegment(handle);

  if (!product) {
    notFound();
  }

  const slug = siteSlugFromProduct(product);
  const heroImage = product.images[0];

  return (
    <>
      <ProductSchema product={product} slug={slug} />
      <div className="">
        <div className="min-h-[80vh] ">
          <ProductDetails
            product={product as Product}
            lcpHero={
              heroImage?.url ? (
                <ProductHeroImage
                  url={heroImage.url}
                  alt={heroImage.altText || product.title}
                  objectFill={isAzadiSaleProduct(product)}
                />
              ) : null
            }
          />
          <ProductTabs product={product as Product} />
          <ProductReviews productId={product?.id} />
        </div>
      </div>
    </>
  );
};

export default MealDetailPage;
