import type {
  ShopifyWebhookAddress,
  ShopifyWebhookOrder,
} from "./types/webhook-order";

/** Column headers — keep in sync with buildOrderSheetRows */
export const ORDER_SHEET_HEADERS = [
  "Order Name",
  "Order Number",
  "Order ID",
  "Created At",
  "Processed At",
  "Financial Status",
  "Fulfillment Status",
  "Currency",
  "Subtotal",
  "Shipping Total",
  "Tax Total",
  "Discount Total",
  "Order Total",
  "Discount Codes",
  "Payment Gateways",
  "Customer First Name",
  "Customer Last Name",
  "Customer Email",
  "Customer Phone",
  "Shipping Name",
  "Shipping Address1",
  "Shipping Address2",
  "Shipping City",
  "Shipping Province",
  "Shipping Zip",
  "Shipping Country",
  "Shipping Phone",
  "Shipping Method",
  "Billing Name",
  "Billing Address1",
  "Billing Address2",
  "Billing City",
  "Billing Province",
  "Billing Zip",
  "Billing Country",
  "Billing Phone",
  "Line Item Title",
  "Variant Title",
  "SKU",
  "Quantity",
  "Line Item Price",
  "Product ID",
  "Variant ID",
  "Vendor",
  "Note",
  "Tags",
  "Order Status URL",
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

function formatDiscountCodes(order: ShopifyWebhookOrder): string {
  const codes = order.discount_codes ?? [];
  if (!codes.length) return "";
  return codes
    .map((d) => {
      const parts = [d.code, d.amount, d.type].filter(Boolean);
      return parts.join(" ");
    })
    .join("; ");
}

function shippingMethod(order: ShopifyWebhookOrder): string {
  const lines = order.shipping_lines ?? [];
  if (!lines.length) return "";
  return lines
    .map((l) => l.title || l.code || "")
    .filter(Boolean)
    .join("; ");
}

function shippingTotal(order: ShopifyWebhookOrder): string {
  const amount = order.total_shipping_price_set?.shop_money?.amount;
  if (amount != null) return str(amount);
  const lines = order.shipping_lines ?? [];
  if (!lines.length) return "";
  const sum = lines.reduce((acc, l) => acc + Number(l.price || 0), 0);
  return Number.isFinite(sum) ? String(sum) : "";
}

function paymentGateways(order: ShopifyWebhookOrder): string {
  if (order.payment_gateway_names?.length) {
    return order.payment_gateway_names.join("; ");
  }
  return str(order.gateway);
}

/**
 * Maps a Shopify order webhook payload to one spreadsheet row per line item.
 * Order / customer / shipping fields are repeated on each product row.
 */
export function buildOrderSheetRows(order: ShopifyWebhookOrder): string[][] {
  const lineItems = order.line_items?.length
    ? order.line_items
    : [
        {
          title: "(no line items)",
          quantity: 0,
          price: "",
        },
      ];

  const customer = order.customer;
  const shipping = order.shipping_address;
  const billing = order.billing_address;

  const shared = [
    str(order.name),
    str(order.order_number),
    str(order.id),
    str(order.created_at),
    str(order.processed_at),
    str(order.financial_status),
    str(order.fulfillment_status),
    str(order.currency ?? order.presentment_currency),
    str(order.subtotal_price),
    shippingTotal(order),
    str(order.total_tax),
    str(order.total_discounts),
    str(order.total_price),
    formatDiscountCodes(order),
    paymentGateways(order),
    str(customer?.first_name),
    str(customer?.last_name),
    str(customer?.email ?? order.email),
    str(customer?.phone ?? order.phone),
    addressName(shipping),
    str(shipping?.address1),
    str(shipping?.address2),
    str(shipping?.city),
    str(shipping?.province),
    str(shipping?.zip),
    str(shipping?.country),
    str(shipping?.phone),
    shippingMethod(order),
    addressName(billing),
    str(billing?.address1),
    str(billing?.address2),
    str(billing?.city),
    str(billing?.province),
    str(billing?.zip),
    str(billing?.country),
    str(billing?.phone),
  ];

  const note = str(order.note);
  const tags = str(order.tags);
  const statusUrl = str(order.order_status_url);

  return lineItems.map((item) => [
    ...shared,
    str(item.title ?? item.name),
    str(item.variant_title),
    str(item.sku),
    str(item.quantity),
    str(item.price),
    str(item.product_id),
    str(item.variant_id),
    str(item.vendor),
    note,
    tags,
    statusUrl,
  ]);
}
