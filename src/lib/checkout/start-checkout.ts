"use client";

import { getBrowserLocation } from "@/lib/geo/get-browser-location";
import { reverseGeocode } from "@/lib/geo/reverse-geocode";
import { createCheckoutWithOptionalAddress } from "@/lib/shopify/actions/checkout";
import {
  buildCartPermalink,
  buildCartPermalinkWithShipping,
} from "@/lib/checkout/build-permalink";

export type StartCheckoutItem = {
  variantId?: string | null;
  quantity: number;
};

/**
 * GPS must fully resolve on this origin before any Shopify redirect.
 *
 * When we have a geocoded address, use a classic cart permalink with
 * `checkout[shipping_address][...]` query params — that is what reliably
 * paints fields on Basic One-Page Checkout. Storefront `/cart/c/...`
 * checkoutUrls often keep the address on the cart object but leave the form blank.
 */
export async function startCheckoutWithOptionalLocation(
  cartItems: StartCheckoutItem[]
): Promise<string> {
  const lineItems = cartItems
    .filter((item) => item.variantId)
    .map((item) => ({
      variantId: item.variantId as string,
      quantity: item.quantity,
    }));

  const permalinkItems = lineItems.map((item) => ({
    variantId: item.variantId.replace("gid://shopify/ProductVariant/", ""),
    quantity: item.quantity,
  }));

  let shippingAddress = null as Awaited<ReturnType<typeof reverseGeocode>>;

  try {
    const coords = await getBrowserLocation({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
    shippingAddress = await reverseGeocode(coords.latitude, coords.longitude);
  } catch (error) {
    console.warn("[checkout] location/geocode skipped", error);
  }

  // Best path for prefilled Delivery fields on Basic hosted checkout.
  if (shippingAddress) {
    return buildCartPermalinkWithShipping(permalinkItems, shippingAddress);
  }

  try {
    const result = await createCheckoutWithOptionalAddress(lineItems, null);
    if (result.checkoutUrl) return result.checkoutUrl;
  } catch (error) {
    console.error("[checkout] Storefront cart failed", error);
  }

  return buildCartPermalink(permalinkItems);
}
