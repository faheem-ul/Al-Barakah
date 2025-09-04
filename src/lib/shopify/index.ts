"use server";
import { Shopifetch } from "./types";

export async function shopifyFetch<T>({
  cache = "force-cache",
  headers,
  query,
  tags,
  variables,
}: Shopifetch<T>): Promise<{ status: number; body: T } | never> {
  const API_URL = process.env.API_URL as string;
  const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env
    .SHOPIFY_STOREFRONT_ACCESS_TOKEN as string;
  debugger;
  // console.log("🔥 Query variables inside shopify Fetch", variables);
  // stringifyLog("🔥 Query variables inside shopify Fetch", variables);

  try {
    const result = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
        ...headers,
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables }),
      }),
      cache,
      ...(tags && { next: { tags } }),
    });

    // const { data } = await response.json();

    // console.log("data", JSON.stringify(data, null, 2));

    const body = await result.json();

    if (body.errors) {
      console.log("body.errors[0]", body.errors[0]);
      throw body.errors[0];
    }

    return {
      status: result.status,
      body,
    };
  } catch (err) {
    console.log("Shopify Fetch error", JSON.stringify(err, null, 4));
    // if (isShopifyError(err)) {
    //   throw {
    //     cause: err.cause?.toString() || "unknown",
    //     status: err.status || 500,
    //     message: err.message,
    //     query,
    //   };
    // }

    throw {
      error: { ...(err as object) },
      query,
    };
  }

  // return response.json();
}
