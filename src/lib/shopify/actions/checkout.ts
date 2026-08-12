"use server";

import { stringifyLog } from "@/lib/utils";
import type { PrefillShippingAddress } from "@/lib/geo/reverse-geocode";
import { shopifyFetch } from "..";
import {
  cartCreateMutation,
  cartDeliveryAddressesAddMutation,
} from "../mutations/cart";

export type CheckoutLineItem = {
  variantId: string;
  quantity: number;
};

type CreateCheckoutResult = {
  checkoutUrl: string;
  usedAddress: boolean;
};

function toMerchandiseGid(variantId: string): string {
  if (variantId.startsWith("gid://")) return variantId;
  return `gid://shopify/ProductVariant/${variantId}`;
}

/**
 * Create a Storefront cart and optionally attach a selected delivery address.
 * Returns the checkoutUrl from AFTER the address mutation (key can change).
 */
export async function createCheckoutWithOptionalAddress(
  lineItems: CheckoutLineItem[],
  shippingAddress?: PrefillShippingAddress | null
): Promise<CreateCheckoutResult> {
  const lines = lineItems
    .filter((item) => item.variantId && item.quantity > 0)
    .map((item) => ({
      variantId: toMerchandiseGid(item.variantId),
      quantity: item.quantity,
    }));

  if (lines.length === 0) {
    return { checkoutUrl: "", usedAddress: false };
  }

  const created = await createCart(lines);
  if (!created?.checkoutUrl) {
    return { checkoutUrl: "", usedAddress: false };
  }

  if (!shippingAddress) {
    return { checkoutUrl: created.checkoutUrl, usedAddress: false };
  }

  const withAddress = await attachDeliveryAddress(
    created.id,
    created.checkoutUrl,
    shippingAddress
  );

  return {
    checkoutUrl: withAddress.checkoutUrl,
    usedAddress: withAddress.usedAddress,
  };
}

async function createCart(
  lines: { variantId: string; quantity: number }[]
): Promise<{ id: string; checkoutUrl: string } | null> {
  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const res = await shopifyFetch<any>({
      query: cartCreateMutation,
      variables: {
        input: {
          lines: lines.map((line) => ({
            merchandiseId: line.variantId,
            quantity: line.quantity,
          })),
          buyerIdentity: {
            countryCode: "PK",
          },
        },
      },
      cache: "no-store",
    });

    const payload = res.body?.data?.cartCreate;
    if (payload?.userErrors?.length) {
      stringifyLog("cartCreate userErrors", payload.userErrors);
      return null;
    }

    const id = payload?.cart?.id as string | undefined;
    const checkoutUrl = payload?.cart?.checkoutUrl as string | undefined;
    if (!id || !checkoutUrl) return null;
    return { id, checkoutUrl };
  } catch (err) {
    stringifyLog("cartCreate error", err);
    return null;
  }
}

async function attachDeliveryAddress(
  cartId: string,
  fallbackCheckoutUrl: string,
  shippingAddress: PrefillShippingAddress
): Promise<{ checkoutUrl: string; usedAddress: boolean }> {
  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const res = await shopifyFetch<any>({
      query: cartDeliveryAddressesAddMutation,
      variables: {
        cartId,
        addresses: [
          {
            selected: true,
            oneTimeUse: true,
            validationStrategy: "COUNTRY_CODE_ONLY",
            address: {
              deliveryAddress: {
                address1: shippingAddress.address1 || shippingAddress.city,
                address2: shippingAddress.address2 || undefined,
                city: shippingAddress.city,
                provinceCode: shippingAddress.provinceCode || undefined,
                countryCode: shippingAddress.country || "PK",
                zip: shippingAddress.zip || undefined,
              },
            },
          },
        ],
      },
      cache: "no-store",
    });

    const payload = res.body?.data?.cartDeliveryAddressesAdd;
    if (payload?.userErrors?.length) {
      stringifyLog("cartDeliveryAddressesAdd userErrors", payload.userErrors);
      return { checkoutUrl: fallbackCheckoutUrl, usedAddress: false };
    }

    const attachedCity =
      payload?.cart?.delivery?.addresses?.[0]?.address?.city;
    const checkoutUrl =
      (payload?.cart?.checkoutUrl as string | undefined) ||
      fallbackCheckoutUrl;

    return {
      checkoutUrl,
      usedAddress: Boolean(attachedCity),
    };
  } catch (err) {
    stringifyLog("cartDeliveryAddressesAdd error", err);
    return { checkoutUrl: fallbackCheckoutUrl, usedAddress: false };
  }
}
