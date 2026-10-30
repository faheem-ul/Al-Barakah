import type { BlogPost } from "@/lib/blog/types";
import { absoluteSitemapUrl } from "@/lib/seo/sitemap-urls";

export function buildBlogPostingSchemaJson(post: BlogPost): string {
  const url = absoluteSitemapUrl(`/blog/${post.slug}`);
  const image = absoluteSitemapUrl(post.featuredImage.src);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image,
    datePublished: post.datePublished,
    author: {
      "@type": "Organization",
      name: "Al-Barakah Honey",
    },
    publisher: {
      "@type": "Organization",
      name: "Al-Barakah Honey",
    },
    mainEntityOfPage: url,
  };

  return JSON.stringify(schema);
}
