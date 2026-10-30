import Image from "next/image";
import Link from "next/link";

import BlogInlineContent from "@/components/Blog/BlogInlineContent";
import {
  WHATSAPP_SUPPORT_PHONE,
  WHATSAPP_SUPPORT_PREFILL,
} from "@/lib/constants";
import type { BlogInline, BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

const bodyTextClass =
  "font-poppins text-[18px] font-normal leading-[30px] text-foreground";

const whatsappHref = `https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${encodeURIComponent(
  WHATSAPP_SUPPORT_PREFILL,
)}`;

function renderParagraph(content: BlogInline[]) {
  const allStrings = content.every((c) => typeof c === "string");
  if (allStrings) {
    const text = content.join("");
    if (text.includes("WhatsApp")) {
      const parts = text.split(/(WhatsApp)/);
      return (
        <p className={bodyTextClass}>
          {parts.map((part, i) =>
            part === "WhatsApp" ? (
              <Link
                key={i}
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                WhatsApp
              </Link>
            ) : (
              part
            ),
          )}
        </p>
      );
    }
  }
  return (
    <p className={bodyTextClass}>
      <BlogInlineContent content={content} />
    </p>
  );
}

export default function BlogArticle({ post }: Props) {
  return (
    <article className="mx-auto max-w-[1117px] px-6 pb-16 pt-8 md:pb-24 md:pt-12">
      <div className="relative mb-10 aspect-[1200/630] w-full overflow-hidden rounded-[24px] md:rounded-[32px]">
        <Image
          src={post.featuredImage.src}
          alt={post.featuredImage.alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1117px"
        />
      </div>

      <time
        dateTime={post.datePublished}
        className="mb-8 block text-[16px] font-medium text-foreground/60"
      >
        {new Date(post.datePublished).toLocaleDateString("en-PK", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>

      <div className="space-y-6">
        {post.blocks.map((block, index) => {
          switch (block.type) {
            case "p":
              return (
                <div key={index}>{renderParagraph(block.content)}</div>
              );
            case "h2":
              return (
                <h2
                  key={index}
                  className="pt-2 font-poppins text-[30px] font-bold leading-[36px]"
                >
                  {block.text}
                </h2>
              );
            case "h3":
              return (
                <h3
                  key={index}
                  className="font-poppins text-[24px] font-bold leading-[30px]"
                >
                  {block.text}
                </h3>
              );
            case "ul":
              return (
                <ul
                  key={index}
                  className="ml-4 list-disc space-y-2 pl-2 marker:text-foreground/70"
                >
                  {block.items.map((item, i) => (
                    <li key={i} className={bodyTextClass}>
                      <BlogInlineContent content={item} />
                    </li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol
                  key={index}
                  className="ml-4 list-decimal space-y-3 pl-2 marker:font-semibold"
                >
                  {block.items.map((item, i) => (
                    <li key={i} className={bodyTextClass}>
                      <BlogInlineContent content={item} />
                    </li>
                  ))}
                </ol>
              );
            case "image":
              return (
                <figure key={index} className="my-8">
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[24px]">
                    <Image
                      src={block.src}
                      alt={block.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  </div>
                </figure>
              );
            case "table":
              return (
                <div
                  key={index}
                  className="my-6 overflow-x-auto rounded-[24px] bg-[#F2EEE6] p-4 md:p-6"
                >
                  <table className="w-full min-w-[480px] border-collapse text-left text-[16px] leading-relaxed md:text-[17px]">
                    <thead>
                      <tr>
                        {block.headers.map((h, hi) => (
                          <th
                            key={hi}
                            className="border-b border-foreground/15 px-3 py-3 font-bold first:pl-0"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`border-b border-foreground/10 px-3 py-3 first:pl-0 ${ci === 0 ? "font-semibold" : ""}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>

      <div className="mt-12 rounded-[40px] bg-[#F2EEE6] px-6 py-8 text-center md:px-10">
        <p className="font-poppins text-[18px] font-semibold leading-[28px]">
          Free delivery across Pakistan on every order.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-[16px] font-semibold underline underline-offset-4"
        >
          Shop our honeys
        </Link>
      </div>
    </article>
  );
}
