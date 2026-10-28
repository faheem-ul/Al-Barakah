import type { MetadataRoute } from "next";

import { SITEMAP_BASE_URL } from "@/lib/seo/sitemap-urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "Facebot",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/admin"],
      },
    ],
    sitemap: `${SITEMAP_BASE_URL}/sitemap.xml`,
  };
}
