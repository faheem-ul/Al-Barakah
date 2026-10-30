import type { Metadata } from "next";

import BlogCard from "@/components/Blog/BlogCard";
import BlogHero from "@/components/Blog/BlogHero";
import { getAllPosts } from "@/lib/blog/posts";
import { pageCanonicalAlternates } from "@/lib/seo/metadata-canonical";

export const metadata: Metadata = {
  title: "Blog | Al-Barakah Honey",
  description:
    "Guides on pure honey, Sidr (Beri) shahad, bee types, and Sunnah recipes — from Al-Barakah Honey, Pakistan.",
  alternates: pageCanonicalAlternates("/blog"),
  openGraph: {
    title: "Blog | Al-Barakah Honey",
    description:
      "Guides on pure honey, Sidr (Beri) shahad, bee types, and Sunnah recipes — from Al-Barakah Honey, Pakistan.",
    url: "/blog",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <BlogHero
        title="Blog"
        subtitle="Honey guides, buying tips, and recipes from Al-Barakah"
      />
      <section className="mx-auto max-w-[1117px] px-6 pb-20 pt-10 md:pb-28">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </>
  );
}
