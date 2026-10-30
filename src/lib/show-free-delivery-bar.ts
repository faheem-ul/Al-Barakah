/** Pages that use the full-bleed hero and hide the black free-delivery strip. */
const FREE_DELIVERY_BAR_HIDDEN_PATHS = new Set([
  "/about-us",
  "/contact-us",
  "/cart",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-policy",
  "/ownership-statement",
  "/blog",
]);

export function shouldShowFreeDeliveryBar(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/admin")) return false;
  if (FREE_DELIVERY_BAR_HIDDEN_PATHS.has(pathname)) return false;
  if (pathname.startsWith("/blog/")) return false;
  return true;
}

/** Tighter navbar top padding when the delivery strip is visible (home + shop/product URLs). */
export function shouldUseCompactNavbarTop(pathname: string): boolean {
  return shouldShowFreeDeliveryBar(pathname);
}
