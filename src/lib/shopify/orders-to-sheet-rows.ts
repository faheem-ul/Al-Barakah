import type {
  ShopifyWebhookAddress,
  ShopifyWebhookOrder,
} from "./types/webhook-order";

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

function productDetail(item: {
  title?: string | null;
  name?: string | null;
}): string {
  return str(item.title ?? item.name).trim();
}

/**
 * Normalize Shopify variant titles into “1 kg” / “1/2 kg” style sizes.
 */
export function bottleSizeFromVariant(
  variantTitle?: string | null,
  productTitle?: string | null
): string {
  const raw = `${str(variantTitle)} ${str(productTitle)}`.toLowerCase();

  if (
    /\b1\s*\/\s*2\s*(kg|kgs|kilo|kilogram)\b/.test(raw) ||
    /\bhalf\s*(kg|kilo)\b/.test(raw) ||
    /\b0\.5\s*(kg|kgs)?\b/.test(raw) ||
    /\b500\s*(g|gm|grams?)\b/.test(raw)
  ) {
    return "1/2 kg";
  }

  if (/\b1\s*(kg|kgs|kilo|kilogram)\b/.test(raw)) {
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
    order.total_shipping_price_set?.shop_money?.amount ?? NaN
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

/**
 * One sheet row per line item.
 * Order-level fields (name, address, COD, total, etc.) live on the first row;
 * continuation rows only fill product columns so Sheets can merge the order block.
 */
export function buildOrderSheetRows(order: ShopifyWebhookOrder): string[][] {
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
        order.customer?.phone
    )
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

  return lineItems.map((item, index) => {
    const retail = retails[index] ?? 0;
    const isFirst = index === 0;
    return [
      isFirst ? orderNumber : "",
      isFirst ? date : "",
      isFirst ? name : "",
      isFirst ? address : "",
      isFirst ? city : "",
      isFirst ? contact : "",
      isFirst ? email : "",
      productDetail(item),
      bottleSizeFromVariant(item.variant_title, item.title),
      str(item.quantity ?? ""),
      retail ? String(retail) : "0",
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
