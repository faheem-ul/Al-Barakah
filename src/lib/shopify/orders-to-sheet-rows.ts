import type {
  ShopifyWebhookAddress,
  ShopifyWebhookLineItem,
  ShopifyWebhookOrder,
} from "./types/webhook-order";
import {
  formatLineItemProductDetail,
  lineItemTitle,
} from "./line-item-detail";

/**
 * Column headers — keep in sync with buildOrderSheetRows.
 * Order Number first (dedupe / M&P emails), then ops columns from the sheet brief.
 */
export const ORDER_SHEET_HEADERS = [
  "Order Number",
  "Date",
  "Name",
  "Address",
  "City",
  "Contact",
  "Email",
  "Product Detail",
  "Bottle Size",
  "Quantity",
  "Retail Price",
  "COD",
  "Total Amount",
  "Order Status",
  "Verify",
  "Tracking Number",
  "Tracking Location",
  "Tracking Detail",
] as const;

function str(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function addressName(address?: ShopifyWebhookAddress | null): string {
  if (!address) return "";
  if (address.name) return address.name;
  return [address.first_name, address.last_name].filter(Boolean).join(" ");
}

function customerName(order: ShopifyWebhookOrder): string {
  const customer = order.customer;
  const fromCustomer = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromCustomer) return fromCustomer;
  return (
    addressName(order.shipping_address) ||
    addressName(order.billing_address) ||
    ""
  );
}

/** Street address only (city lives in its own column). */
function formatStreetAddress(address?: ShopifyWebhookAddress | null): string {
  if (!address) return "";
  return [address.address1, address.address2]
    .map((part) => str(part).trim())
    .filter(Boolean)
    .join(", ");
}

/** DD/MM/YYYY for Pakistan ops sheet */
function formatOrderDate(order: ShopifyWebhookOrder): string {
  const raw = order.processed_at || order.created_at;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Prefer 0300-1234567 style when phone looks Pakistani. */
function formatContact(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 12 && digits.startsWith("92")) {
    return `0${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return phone.trim();
}

/**
 * Normalize Shopify variant titles into “1 kg” / “1/2 kg” style sizes.
 */
export function bottleSizeFromVariant(
  variantTitle?: string | null,
  productTitle?: string | null,
): string {
  const raw = `${str(variantTitle)} ${str(productTitle)}`.toLowerCase();

  if (
    /\b1\s*\/\s*2\s*(kg|kgs|kilo|kilogram)\b/.test(raw) ||
    /\bhalf\s*(kg|kilo)\b/.test(raw) ||
    /\(\s*kg\s*1\s*\/\s*2/.test(raw) ||
    /\b0\.5\s*(kg|kgs)?\b/.test(raw) ||
    /\b500\s*(g|gm|grams?)\b/.test(raw)
  ) {
    return "1/2 kg";
  }

  if (/\b1\s*(kg|kgs|kilo|kilogram)\b/.test(raw) || /\(\s*kg\s*1\b/.test(raw)) {
    return "1 kg";
  }

  const variant = str(variantTitle).trim();
  if (!variant || variant.toLowerCase() === "default title") return "";
  return variant;
}

function lineRetailPrice(item: {
  price?: string | null;
  quantity?: number | null;
}): number {
  const unit = Number(item.price ?? 0);
  const qty = Number(item.quantity ?? 0);
  if (!Number.isFinite(unit) || !Number.isFinite(qty)) return 0;
  return Math.round(unit * qty);
}

function orderCodAmount(order: ShopifyWebhookOrder): number {
  const fromSet = Number(
    order.total_shipping_price_set?.shop_money?.amount ?? NaN,
  );
  if (Number.isFinite(fromSet) && fromSet >= 0) {
    return Math.round(fromSet);
  }

  const fromLines = (order.shipping_lines ?? []).reduce((sum, line) => {
    const amount = Number(line.price ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return Math.round(fromLines);
}

/**
 * Delivery-facing status for ops (M&P later overwrites when CN is pasted).
 */
export function initialOrderStatus(order: ShopifyWebhookOrder): string {
  const fulfillment = str(order.fulfillment_status).toLowerCase();
  if (fulfillment === "fulfilled") return "Delivered";
  if (str(order.cancelled_at) || fulfillment === "restocked") return "Cancelled";

  const financial = str(order.financial_status).toLowerCase();
  if (financial === "refunded" || financial === "voided") return "Cancelled";

  return "Pending";
}

type SheetProductPart = {
  detail: string;
  bottleSize: string;
  quantity: string;
  retail: string;
};

const WEIGHT_PAREN_RE =
  /\(\s*(?:1\s*\/\s*2\s*kg[^)]*|half\s*kg[^)]*|kg\s*1\s*\/\s*2[^)]*|1\s*kg[^)]*|kg\s*1(?:\s|\))[^)]*|[^)]*(?:kg|Half)[^)]*)\)/i;

const WEIGHT_ONLY_LINE_RE = /^\([^)]*(?:kg|Half)[^)]*\)$/i;

/** Pull bottle size out of a combo content line; keep the honey name clean. */
export function splitComboContentLine(line: string): {
  name: string;
  bottleSize: string;
} {
  const raw = str(line).trim();
  if (!raw) return { name: "", bottleSize: "" };

  const match = raw.match(WEIGHT_PAREN_RE);
  if (!match) {
    return {
      name: raw,
      bottleSize: bottleSizeFromVariant(raw, raw),
    };
  }

  const bottleSize = bottleSizeFromVariant(match[0], match[0]);
  const name = raw
    .replace(match[0], " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s—\-–|:]+|[\s—\-–|:]+$/g, "")
    .trim();

  return { name, bottleSize };
}

function looksLikeWeightLine(line: string): boolean {
  return (
    WEIGHT_PAREN_RE.test(line) ||
    /\b1\s*\/\s*2\s*(kg|kgs)?\b/i.test(line) ||
    /\b\d+(?:\.\d+)?\s*(kg|kgs)\b/i.test(line) ||
    /\bhalf\s*(kg)?\b/i.test(line)
  );
}

function isWeightOnlyLine(line: string): boolean {
  return WEIGHT_ONLY_LINE_RE.test(str(line).trim());
}

/**
 * Pair combo content lines into jar rows.
 * Supports:
 *   (1/2 kg) Name
 *   Name (1/2 kg)
 *   Name
 *   (1/2 kg)
 */
export function pairComboJarLines(
  contentLines: string[],
): { name: string; bottleSize: string }[] {
  const jars: { name: string; bottleSize: string }[] = [];
  let i = 0;

  while (i < contentLines.length) {
    const line = contentLines[i];
    const next = contentLines[i + 1];

    if (isWeightOnlyLine(line)) {
      const size = bottleSizeFromVariant(line, line);
      if (jars.length && !jars[jars.length - 1].bottleSize) {
        jars[jars.length - 1].bottleSize = size;
      } else if (size) {
        jars.push({ name: "", bottleSize: size });
      }
      i += 1;
      continue;
    }

    if (next && isWeightOnlyLine(next)) {
      const { name } = splitComboContentLine(line);
      jars.push({
        name: name || line,
        bottleSize: bottleSizeFromVariant(next, next),
      });
      i += 2;
      continue;
    }

    jars.push(splitComboContentLine(line));
    i += 1;
  }

  return jars.filter((jar) => jar.name || jar.bottleSize);
}

/**
 * Expand one Shopify line into sheet product rows.
 * Combos (deal + multiple jar lines) → one row per jar:
 *   Product Detail = "Daily Duo — {honey name}"
 *   Bottle Size = 1/2 kg / 1 kg
 * Single products → one row with product title only.
 */
export function expandLineItemParts(
  item: ShopifyWebhookLineItem,
  detailText: string,
): SheetProductPart[] {
  const dealTitle = lineItemTitle(item);
  const qty = Math.max(1, Number(item.quantity ?? 1) || 1);
  const retail = lineRetailPrice(item);
  const lines = detailText
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let contentLines = lines;
  if (
    lines.length >= 2 &&
    lines[0].replace(/\s+/g, " ").toLowerCase() ===
      dealTitle.replace(/\s+/g, " ").toLowerCase()
  ) {
    contentLines = lines.slice(1);
  }

  const jars = pairComboJarLines(contentLines);
  const jarRows = jars.filter((jar) => jar.name || jar.bottleSize);
  const isComboExpansion =
    jarRows.length >= 2 ||
    (jarRows.length === 1 &&
      Boolean(jarRows[0].name) &&
      jarRows[0].name.replace(/\s+/g, " ").toLowerCase() !==
        dealTitle.replace(/\s+/g, " ").toLowerCase() &&
      looksLikeWeightLine(contentLines.join("\n")));

  if (isComboExpansion && jarRows.length >= 1) {
    // If only one jar had a size, copy it to siblings (e.g. Duo "1/2 kg each")
    const sharedSize =
      jarRows.find((jar) => jar.bottleSize)?.bottleSize ||
      bottleSizeFromVariant(item.variant_title, item.title);

    return jarRows.map((jar, index) => {
      const honeyName = jar.name.trim();
      const detail = honeyName ? `${dealTitle} — ${honeyName}` : dealTitle;
      return {
        detail,
        bottleSize: jar.bottleSize || sharedSize || "",
        quantity: String(qty),
        retail: index === 0 ? String(retail || 0) : "0",
      };
    });
  }

  const bottleSize =
    bottleSizeFromVariant(item.variant_title, item.title) ||
    jarRows[0]?.bottleSize ||
    "";

  return [
    {
      // Always the product / deal title — never marketing description
      detail: dealTitle,
      bottleSize,
      quantity: str(item.quantity ?? ""),
      retail: retail ? String(retail) : "0",
    },
  ];
}

/**
 * One sheet row per product part (separate SKUs, or each jar inside a combo).
 * Order-level fields (name, address, COD, total, etc.) live on the first row;
 * continuation rows only fill product columns so Sheets can merge the order block.
 *
 * @param productDetails Optional pre-resolved Product Detail strings (combo name + contents).
 */
export function buildOrderSheetRows(
  order: ShopifyWebhookOrder,
  productDetails?: string[],
): string[][] {
  const lineItems = order.line_items?.length
    ? order.line_items
    : [{ title: "(no line items)", quantity: 0, price: "0" }];

  const shipping = order.shipping_address;
  const billing = order.billing_address;

  const orderNumber = str(order.order_number ?? order.name);
  const date = formatOrderDate(order);
  const name = customerName(order);
  const address =
    formatStreetAddress(shipping) || formatStreetAddress(billing);
  const city = str(shipping?.city || billing?.city);
  const contact = formatContact(
    str(
      shipping?.phone ||
        billing?.phone ||
        order.phone ||
        order.customer?.phone,
    ),
  );
  // Webhook payload includes email even on Basic plans (Admin API PII does not).
  const email = str(order.email || order.customer?.email)
    .trim()
    .toLowerCase();
  const cod = orderCodAmount(order);
  const status = initialOrderStatus(order);

  const retails = lineItems.map((item) => lineRetailPrice(item));
  const orderTotal =
    retails.reduce((sum, n) => sum + n, 0) + (Number.isFinite(cod) ? cod : 0);

  const productParts: SheetProductPart[] = [];
  lineItems.forEach((item, index) => {
    const detail =
      productDetails?.[index]?.trim() || formatLineItemProductDetail(item);
    productParts.push(...expandLineItemParts(item, detail));
  });

  if (!productParts.length) {
    productParts.push({
      detail: "(no line items)",
      bottleSize: "",
      quantity: "0",
      retail: "0",
    });
  }

  return productParts.map((part, index) => {
    const isFirst = index === 0;
    return [
      isFirst ? orderNumber : "",
      isFirst ? date : "",
      isFirst ? name : "",
      isFirst ? address : "",
      isFirst ? city : "",
      isFirst ? contact : "",
      isFirst ? email : "",
      part.detail,
      part.bottleSize,
      part.quantity,
      part.retail,
      isFirst ? String(cod) : "",
      isFirst ? String(orderTotal) : "",
      isFirst ? status : "",
      isFirst ? "false" : "", // Verify — admin types true after checking address
      "", // Tracking Number — Apps Script after Verify=true
      "", // Tracking Location — Apps Script
      "", // Tracking Detail — Apps Script
    ];
  });
}

/** Columns merged across multi-item order blocks (product cols stay split). */
export const ORDER_LEVEL_MERGE_HEADERS = [
  "Order Number",
  "Date",
  "Name",
  "Address",
  "City",
  "Contact",
  "Email",
  "COD",
  "Total Amount",
  "Order Status",
  "Verify",
  "Tracking Number",
  "Tracking Location",
  "Tracking Detail",
] as const;
