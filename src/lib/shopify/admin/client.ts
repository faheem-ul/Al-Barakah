const LOG = "[Shopify Admin]";

export const ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION?.trim() || "2024-10";

export function getAdminConfig() {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();

  if (!shopDomain || !accessToken) {
    throw new Error(
      "Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN"
    );
  }

  return { shopDomain, accessToken };
}

export function normalizeOrderNumber(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^#/, "");
}

export async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const { shopDomain, accessToken } = getAdminConfig();
  const url = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const body = await response.json();
  if (!response.ok) {
    console.error(`${LOG} HTTP ${response.status}`, body);
    throw new Error(`Shopify Admin HTTP ${response.status}`);
  }
  if (body.errors?.length) {
    console.error(`${LOG} GraphQL errors`, body.errors);
    throw new Error(body.errors[0]?.message || "Shopify Admin GraphQL error");
  }
  return body.data as T;
}
