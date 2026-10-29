import Image from "next/image";

import { cn } from "@/lib/utils";

const HERO_SIZES = "(max-width: 768px) 100vw, 520px";

type ProductHeroImageProps = {
  url: string;
  alt: string;
  objectFill?: boolean;
};

/** Server-rendered LCP hero (priority + sizes) for product pages. */
export default function ProductHeroImage({
  url,
  alt,
  objectFill = false,
}: ProductHeroImageProps) {
  if (!url) return null;

  return (
    <Image
      src={url}
      alt={alt}
      fill
      priority
      sizes={HERO_SIZES}
      className={cn(objectFill ? "object-fill" : "object-cover", "z-0")}
    />
  );
}

export { HERO_SIZES };
