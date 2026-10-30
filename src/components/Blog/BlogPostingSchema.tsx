import { buildBlogPostingSchemaJson } from "@/lib/seo/blog-posting-schema";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

export default function BlogPostingSchema({ post }: Props) {
  const json = buildBlogPostingSchemaJson(post);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
