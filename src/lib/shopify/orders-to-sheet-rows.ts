import type {
  ShopifyWebhookAddress,
  ShopifyWebhookOrder,
} from "./types/webhook-order";

/** Column headers — keep in sync with buildOrderSheetRows */
export const ORDER_SHEET_HEADERS = [
  "Order Number",
  "Email",
  "Phone",
  "Name of User",
  "Address",
  "Product Name",
  "Quantity",
  "Price",
  "Financial Status",
  // M&P tracking — paste Tracking Number; Apps Script fills the rest
  "Tracking Number",
  "Tracking URL",
  "Tracking Status",
  "Tracking Location",
  "Tracking Detail",
  "Tracking Checked At",
] as const;

export const TRACKING_SHEET_HEADERS = [
  "Tracking Number",
  "Tracking URL",
  "Tracking Status",
  "Tracking Location",
  "Tracking Detail",
  "Tracking Checked At",
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

function formatAddress(address?: ShopifyWebhookAddress | null): string {
  if (!address) return "";
  return [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country,
  ]
    .map((part) => str(part).trim())
    .filter(Boolean)
    .join(", ");
}

function formatPrice(order: ShopifyWebhookOrder): string {
  const amount = str(order.total_price);
  const currency = str(order.currency ?? order.presentment_currency);
  if (!amount) return "";
  return currency ? `${amount} ${currency}` : amount;
}

function productName(item: {
  title?: string | null;
  name?: string | null;
  variant_title?: string | null;
}): string {
  const title = str(item.title ?? item.name);
  const variant = str(item.variant_title);
  if (variant && variant.toLowerCase() !== "default title") {
    return title ? `${title} — ${variant}` : variant;
  }
  return title;
}

/**
 * One sheet row per line item (order fields repeated).
 */
export function buildOrderSheetRows(order: ShopifyWebhookOrder): string[][] {
  const lineItems = order.line_items?.length
    ? order.line_items
    : [{ title: "(no line items)", quantity: 0 }];

  const customer = order.customer;
  const shipping = order.shipping_address;
  const billing = order.billing_address;

  const orderNumber = str(order.order_number ?? order.name);
  const email = str(customer?.email ?? order.email);
  const phone = str(
    customer?.phone ?? order.phone ?? shipping?.phone ?? billing?.phone
  );
  const name = customerName(order);
  const address = formatAddress(shipping) || formatAddress(billing);
  const price = formatPrice(order);
  const financialStatus = str(order.financial_status);
  const trackingPlaceholder = ["", "", "", "", "", ""];

  return lineItems.map((item) => [
    orderNumber,
    email,
    phone,
    name,
    address,
    productName(item),
    str(item.quantity),
    price,
    financialStatus,
    ...trackingPlaceholder,
  ]);
}
