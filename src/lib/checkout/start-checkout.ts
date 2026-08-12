"use client";

// GPS / reverse-geocode temporarily disabled — re-enable later with Maps key or free OSM.
// import { getBrowserLocation } from "@/lib/geo/get-browser-location";
// import { reverseGeocode } from "@/lib/geo/reverse-geocode";
import { createCheckoutWithOptionalAddress } from "@/lib/shopify/actions/checkout";
import {
  buildCartPermalink,
  // buildCartPermalinkWithShipping,
} from "@/lib/checkout/build-permalink";

export type StartCheckoutItem = {
  variantId?: string | null;
  quantity: number;
};

/**
 * Redirect buyer to Shopify checkout.
 *
 * NOTE: Location autofill is commented out for now (apartment/POI quality needs a
 * Maps API key). Uncomment the location block below when revisiting this feature.
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

  // -------------------------------------------------------------------------
  // TODO: re-enable GPS + reverse-geocode checkout prefill later
  // -------------------------------------------------------------------------
  // let shippingAddress = null as Awaited<ReturnType<typeof reverseGeocode>>;
  //
  // try {
  //   const coords = await getBrowserLocation({
  //     enableHighAccuracy: true,
  //     timeout: 12000,
  //     maximumAge: 0,
  //   });
  //   shippingAddress = await reverseGeocode(coords.latitude, coords.longitude);
  // } catch (error) {
  //   console.warn("[checkout] location/geocode skipped", error);
  // }
  //
  // // Prefill Delivery fields via cart permalink + checkout[shipping_address] params
  // if (shippingAddress) {
  //   return buildCartPermalinkWithShipping(permalinkItems, shippingAddress);
  // }
  // -------------------------------------------------------------------------

  try {
    const result = await createCheckoutWithOptionalAddress(lineItems, null);
    if (result.checkoutUrl) return result.checkoutUrl;
  } catch (error) {
    console.error("[checkout] Storefront cart failed", error);
  }

  return buildCartPermalink(permalinkItems);
}
