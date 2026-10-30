import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogArticle from "@/components/Blog/BlogArticle";
import BlogHero from "@/components/Blog/BlogHero";
import BlogPostingSchema from "@/components/Blog/BlogPostingSchema";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const path = `/blog/${slug}`;

  return {
    title: post.seoTitle,
    description: post.metaDescription,
    alternates: pageCanonicalAlternates(path),
    openGraph: {
      title: post.seoTitle,
      description: post.metaDescription,
      url: path,
      type: "article",
      publishedTime: post.datePublished,
      images: [
        {
          url: post.featuredImage.src,
          width: post.featuredImage.width,
          height: post.featuredImage.height,
          alt: post.featuredImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.metaDescription,
      images: [post.featuredImage.src],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <BlogPostingSchema post={post} />
      <BlogHero title={post.title} />
      <BlogArticle post={post} />
    </>
  );
}
