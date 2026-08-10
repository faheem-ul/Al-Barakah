import type { PrefillShippingAddress } from "@/lib/geo/reverse-geocode";

export type PermalinkLineItem = {
  variantId: string;
  quantity: number;
};

/** Classic Shopify cart permalink (`/cart/{variantId}:{qty},...`). */
export function buildCartPermalink(lineItems: PermalinkLineItem[]): string {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL;
  const previewKey = process.env.NEXT_PUBLIC_THEME_PREVIEW_KEY;
  if (!storeUrl) return "";

  const cartQuery = lineItems
    .map((item) => {
      const id = String(item.variantId).replace(
        "gid://shopify/ProductVariant/",
        ""
      );
      return `${id}:${item.quantity}`;
    })
    .join(",");

  const url = `${storeUrl.replace(/\/$/, "")}/cart/${cartQuery}`;
  return previewKey ? `${url}?key=${previewKey}` : url;
}

/**
 * Prefill hosted checkout fields via Shopify's documented `checkout[...]` query params.
 * Works with cart permalinks and often with Storefront `checkoutUrl`s too.
 */
export function withShippingPrefillParams(
  checkoutOrCartUrl: string,
  shipping: PrefillShippingAddress
): string {
  if (!checkoutOrCartUrl) return "";

  try {
    const url = new URL(checkoutOrCartUrl);
    const set = (key: string, value?: string) => {
      const trimmed = value?.trim();
      if (trimmed) url.searchParams.set(key, trimmed);
    };

    set("checkout[shipping_address][address1]", shipping.address1);
    // Never send apartment if empty or identical to the street address.
    const apartment =
      shipping.address2 &&
      shipping.address2.trim().toLowerCase() !==
        shipping.address1.trim().toLowerCase()
        ? shipping.address2
        : "";
    set("checkout[shipping_address][address2]", apartment);
    set("checkout[shipping_address][city]", shipping.city);
    set(
      "checkout[shipping_address][province]",
      shipping.provinceCode || shipping.province
    );
    set(
      "checkout[shipping_address][country]",
      shipping.country === "PK" ? "Pakistan" : shipping.country
    );
    set("checkout[shipping_address][zip]", shipping.zip);

    return url.toString();
  } catch {
    return checkoutOrCartUrl;
  }
}

export function buildCartPermalinkWithShipping(
  lineItems: PermalinkLineItem[],
  shipping?: PrefillShippingAddress | null
): string {
  const base = buildCartPermalink(lineItems);
  if (!base) return "";
  if (!shipping) return base;
  return withShippingPrefillParams(base, shipping);
}
