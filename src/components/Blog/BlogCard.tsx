import Image from "next/image";
import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

export default function BlogCard({ post }: Props) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[40px] bg-[#F2EEE6] transition hover:opacity-95"
    >
      <div className="relative aspect-[1200/630] w-full overflow-hidden">
        <Image
          src={post.featuredImage.src}
          alt={post.featuredImage.alt}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 540px"
        />
      </div>
      <div className="flex flex-1 flex-col px-6 py-6 md:px-8 md:py-8">
        <time
          dateTime={post.datePublished}
          className="text-[14px] font-medium text-foreground/60"
        >
          {new Date(post.datePublished).toLocaleDateString("en-PK", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <h2 className="mt-2 font-poppins text-[22px] font-bold leading-snug md:text-[26px]">
          {post.title}
        </h2>
        <p className="mt-3 flex-1 font-poppins text-[16px] leading-[26px] text-foreground/85 md:text-[17px]">
          {post.metaDescription}
        </p>
        <span className="mt-5 inline-block text-[16px] font-semibold underline underline-offset-4">
          Read more
        </span>
      </div>
    </Link>
  );
}
