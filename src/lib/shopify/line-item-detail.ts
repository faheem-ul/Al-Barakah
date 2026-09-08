import {
  getComboCategoryForProduct,
  isComboProduct,
  type ComboCategoryConfig,
} from "@/components/Home/ComboDeals/comboConfig";
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
 *
 * Single products: title only (never the marketing description).
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

function lineLooksLikeWeight(line: string): boolean {
  return (
    /\([^)]*(?:kg|KG|Kg|Half)[^)]*\)/i.test(line) ||
    /\b1\s*\/\s*2\s*(kg|kgs)?\b/i.test(line) ||
    /\b\d+(?:\.\d+)?\s*(kg|kgs)\b/i.test(line) ||
    /\bhalf\s*(kg)?\b/i.test(line)
  );
}

/**
 * When combo description lists jar names without weights, attach defaults
 * from the combo category (e.g. Duo → 1/2 kg each).
 */
export function ensureComboContentWeights(
  lines: string[],
  category: ComboCategoryConfig | undefined,
): string[] {
  const cleaned = lines.map((line) => str(line)).filter(Boolean);
  if (!cleaned.length || !category) return cleaned;
  if (cleaned.some(lineLooksLikeWeight)) return cleaned;

  if (category.id === "duo") {
    return cleaned.map((line) => `${line} (1/2 kg)`);
  }
  if (category.id === "family") {
    return cleaned.map((line) => `${line} (1 kg)`);
  }
  if (category.id === "mix") {
    return cleaned.map((line, index) =>
      index === 0 ? `${line} (1 kg)` : `${line} (1/2 kg)`,
    );
  }

  return cleaned;
}

/**
 * Resolve Product Detail text for each line item.
 * - Regular products → product title only
 * - Combos → deal title + jar lines (from Includes properties, or combo description)
 */
export async function resolveOrderProductDetails(
  lineItems: ShopifyWebhookLineItem[] | null | undefined,
): Promise<string[]> {
  const items = lineItems?.length
    ? lineItems
    : [{ title: "(no line items)", quantity: 0, price: "0" }];

  const details = items.map((item) => formatLineItemProductDetail(item));

  const needsProductLookup = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Boolean(item.product_id))
    .filter(({ item }) => {
      const includes = lineItemIncludeLines(item);
      // No jar lines yet → may be a combo needing description fallback
      if (!includes.length) return true;
      // Jar lines present but no weights → may need category defaults
      return !includes.some(lineLooksLikeWeight);
    });

  if (!needsProductLookup.length) {
    console.log(`${LOG} All line items resolved from properties / title`);
    return details;
  }

  const productIds = Array.from(
    new Set(
      needsProductLookup.map(({ item }) =>
        toProductGid(item.product_id as number),
      ),
    ),
  );

  console.log(`${LOG} Fetching products for combo/title resolve`, productIds);

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
          isCombo: isComboProduct(p),
          hasDescription: Boolean(productPlainDescription(p)),
          collections: p.collections?.map((c) => c.handle) ?? [],
        })),
      );
    }

    for (const { item, index } of needsProductLookup) {
      const product = findFetchedProduct(products, item.product_id as number);
      if (!product) {
        console.warn(
          `${LOG} No product for line "${lineItemTitle(item)}" id=${item.product_id}`,
        );
        continue;
      }

      // Never paste marketing copy onto single-product sheet / email rows
      if (!isComboProduct(product)) {
        details[index] = lineItemTitle(item);
        continue;
      }

      const category = getComboCategoryForProduct(product);
      const existingIncludes = lineItemIncludeLines(item);

      if (existingIncludes.length) {
        const weighted = ensureComboContentWeights(existingIncludes, category);
        details[index] = [lineItemTitle(item), ...weighted].join("\n");
        console.log(
          `${LOG} Applied combo weights to Includes for "${lineItemTitle(item)}"`,
        );
        continue;
      }

      const description = productPlainDescription(product);
      if (!description) {
        console.warn(
          `${LOG} Empty description for combo "${product.title}" (${product.id})`,
        );
        continue;
      }

      if (
        description.replace(/\s+/g, " ").toLowerCase() ===
        lineItemTitle(item).toLowerCase()
      ) {
        continue;
      }

      const rawContents = getComboDescriptionLines(description);
      const withoutTitle = rawContents.filter(
        (line) =>
          line.replace(/\s+/g, " ").toLowerCase() !==
          lineItemTitle(item).toLowerCase(),
      );
      if (!withoutTitle.length) continue;

      const contents = ensureComboContentWeights(withoutTitle, category);
      details[index] = formatLineItemProductDetail(item, contents);
      console.log(
        `${LOG} Enriched combo "${lineItemTitle(item)}" with ${contents.length} jar line(s)`,
      );
    }
  } catch (error) {
    console.warn(`${LOG} Combo description fallback failed:`, error);
  }

  return details;
}
