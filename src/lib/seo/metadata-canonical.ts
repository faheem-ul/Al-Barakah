import type { Metadata } from "next";

/** Relative path for `alternates.canonical` (resolved with root `metadataBase`). */
export function pageCanonicalPath(path: string): string {
  if (path === "" || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function pageCanonicalAlternates(path: string): Metadata["alternates"] {
  return { canonical: pageCanonicalPath(path) };
}

/** Merge canonical into an existing metadata object. */
export function withPageCanonical(
  path: string,
  metadata: Metadata,
): Metadata {
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: pageCanonicalPath(path),
    },
  };
}
