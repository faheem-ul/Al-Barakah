import ProductDetails from "@/components/Product";
import ProductReviews from "@/components/Product/ProductReviews";
import ProductTabs from "@/components/Product/ProductTabs";
import ProductSchema from "@/components/seo/ProductSchema";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";
import { siteSlugFromProduct } from "@/lib/seo/product-schema";
import { resolveProductByPathSegment } from "@/lib/seo/resolve-product-by-path";
import { productPublicPath } from "@/lib/seo/sitemap-urls";
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

  const canonicalPath = productPublicPath(product);
  const title = `${product.title} | Al-Barakah Honey`;
  const description =
    product.description?.replace(/<[^>]+>/g, " ").slice(0, 160).trim() ||
    "Pure wild honey from Al-Barakah Honey, Pakistan.";

  return {
    title,
    description,
    alternates: pageCanonicalAlternates(canonicalPath),
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const MealDetailPage = async ({ params }: Props) => {
  const { handle } = await params;
  const product = await resolveProductByPathSegment(handle);

  if (!product) {
    notFound();
  }

  const slug = siteSlugFromProduct(product);

  return (
    <>
      <ProductSchema product={product} slug={slug} />
      <div className="">
        <div className="min-h-[80vh] ">
          <ProductDetails product={product as Product} />
          <ProductTabs product={product as Product} />
          <ProductReviews productId={product?.id} />
        </div>
      </div>
    </>
  );
};

export default MealDetailPage;
