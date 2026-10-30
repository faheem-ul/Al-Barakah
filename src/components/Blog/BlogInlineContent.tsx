import Link from "next/link";
import React from "react";

import type { BlogInline } from "@/lib/blog/types";

type Props = {
  content: BlogInline[];
  className?: string;
};

export default function BlogInlineContent({ content, className }: Props) {
  return (
    <span className={className}>
      {content.map((part, i) => {
        if (typeof part === "string") {
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }
        return (
          <Link
            key={i}
            href={part.href}
            className="text-foreground font-semibold underline underline-offset-2 hover:opacity-80"
          >
            {part.label}
          </Link>
        );
      })}
    </span>
  );
}
