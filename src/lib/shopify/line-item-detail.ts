import { getComboDescriptionLines } from "@/components/Home/ComboDeals/comboTextFormat";
import { getCartProducts } from "@/lib/shopify/actions/product";
import type { Product } from "@/lib/shopify/types";
import type { ShopifyWebhookLineItem } from "@/lib/shopify/types/webhook-order";

const LOG = "[line-item-detail]";

function str(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

type LineProperty = {
  name?: string | null;
  key?: string | null;
  value?: string | null;
};

function normalizeProperty(prop: LineProperty): { name: string; value: string } {
  return {
    name: str(prop.name ?? prop.key),
    value: str(prop.value).replace(/\u200B/g, "").trim(),
  };
}

/**
 * Combo contents from checkout line-item properties
 * (e.g. Includes / Includes 1 / Includes 2).
 */
export function lineItemIncludeLines(
  item: Pick<ShopifyWebhookLineItem, "properties">,
): string[] {
  const props = (item.properties ?? []).map(normalizeProperty);

  const fromIncludes = props
    .filter(
      (prop) =>
        /^includes(\s+\d+)?$/i.test(prop.name) && Boolean(prop.value),
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    )
    .map((prop) => prop.value);

  if (fromIncludes.length) return fromIncludes;

  // Fallback: any property value that looks like a weight + product line
  return props
    .map((prop) => prop.value || prop.name)
    .filter((line) => /\([^)]*(?:kg|KG|Kg|Half)/i.test(line));
}

export function lineItemTitle(
  item: Pick<ShopifyWebhookLineItem, "title" | "name">,
): string {
  return str(item.title ?? item.name) || "Item";
}

/**
 * Deal name + included products for sheets / emails:
 *   Power Pair
 *   (1 kg) بڑی مکھی کا جنگلی شہد
 *   (1 kg) چھوٹی مکھی کا جنگلی شہد
 */
export function formatLineItemProductDetail(
  item: Pick<ShopifyWebhookLineItem, "title" | "name" | "properties">,
  fallbackContents: string[] = [],
): string {
  const title = lineItemTitle(item);
  const contents = lineItemIncludeLines(item);
  const lines = contents.length ? contents : fallbackContents;
  if (!lines.length) return title;
  return [title, ...lines].join("\n");
}

function toProductGid(productId: string | number): string {
  const raw = String(productId);
  if (raw.startsWith("gid://")) return raw;
  return `gid://shopify/Product/${raw}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Prefer plain description; fall back to HTML body without tags. */
function productPlainDescription(product: Product): string {
  const plain = str(product.description);
  if (plain) return plain;
  const html = str(product.descriptionHtml);
  if (html) return stripHtml(html);
  return "";
}

function findFetchedProduct(
  products: Product[],
  productId: string | number,
): Product | undefined {
  const gid = toProductGid(productId);
  const numeric = String(productId).replace(/^gid:\/\/shopify\/Product\//, "");
  return products.find(
    (p) =>
      p.id === gid ||
      p.id === numeric ||
      p.id.endsWith(`/${numeric}`) ||
      p.id.endsWith(`Product/${numeric}`),
  );
}

/**
 * Resolve Product Detail text for each line item.
 * Prefers checkout properties; otherwise loads Shopify product description
 * (same source as combo cards on the homepage).
 */
export async function resolveOrderProductDetails(
  lineItems: ShopifyWebhookLineItem[] | null | undefined,
): Promise<string[]> {
  const items = lineItems?.length
    ? lineItems
    : [{ title: "(no line items)", quantity: 0, price: "0" }];

  const details = items.map((item) => formatLineItemProductDetail(item));

  const needsFallback = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        lineItemIncludeLines(item).length === 0 && Boolean(item.product_id),
    );

  if (!needsFallback.length) {
    console.log(`${LOG} All line items resolved from properties`);
    return details;
  }

  const productIds = Array.from(
    new Set(
      needsFallback.map(({ item }) => toProductGid(item.product_id as number)),
    ),
  );

  console.log(`${LOG} Fetching product descriptions for`, productIds);

  try {
    const result = await getCartProducts(productIds);
    const products = result.success ? result.data ?? [] : [];

    if (!result.success) {
      console.warn(`${LOG} getCartProducts failed:`, result.error);
    } else {
      console.log(
        `${LOG} Fetched ${products.length}/${productIds.length} product(s)`,
        products.map((p) => ({
          id: p.id,
          title: p.title,
          hasDescription: Boolean(productPlainDescription(p)),
          collections: p.collections?.map((c) => c.handle) ?? [],
        })),
      );
    }

    for (const { item, index } of needsFallback) {
      const product = findFetchedProduct(products, item.product_id as number);
      if (!product) {
        console.warn(
          `${LOG} No product for line "${lineItemTitle(item)}" id=${item.product_id}`,
        );
        continue;
      }

      const description = productPlainDescription(product);
      if (!description) {
        console.warn(
          `${LOG} Empty description for "${product.title}" (${product.id})`,
        );
        continue;
      }

      // Skip if description is just repeating the title
      if (
        description.replace(/\s+/g, " ").toLowerCase() ===
        lineItemTitle(item).toLowerCase()
      ) {
        continue;
      }

      const contents = getComboDescriptionLines(description);
      if (!contents.length) continue;

      // Don't duplicate title if description formatting put the title first
      const withoutTitle = contents.filter(
        (line) =>
          line.replace(/\s+/g, " ").toLowerCase() !==
          lineItemTitle(item).toLowerCase(),
      );

      if (!withoutTitle.length) continue;

      details[index] = formatLineItemProductDetail(item, withoutTitle);
      console.log(
        `${LOG} Enriched "${lineItemTitle(item)}" with ${withoutTitle.length} content line(s)`,
      );
    }
  } catch (error) {
    console.warn(`${LOG} Combo description fallback failed:`, error);
  }

  return details;
}
