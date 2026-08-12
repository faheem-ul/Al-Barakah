/** Shopify Admin REST webhook payload for orders/paid */

export type ShopifyWebhookAddress = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country?: string | null;
  country_code?: string | null;
  phone?: string | null;
  company?: string | null;
};

export type ShopifyWebhookLineItem = {
  id?: number;
  title?: string | null;
  variant_title?: string | null;
  name?: string | null;
  sku?: string | null;
  quantity?: number | null;
  price?: string | null;
  product_id?: number | null;
  variant_id?: number | null;
  vendor?: string | null;
  requires_shipping?: boolean | null;
  taxable?: boolean | null;
  gift_card?: boolean | null;
  fulfillment_status?: string | null;
};

export type ShopifyWebhookShippingLine = {
  title?: string | null;
  code?: string | null;
  price?: string | null;
};

export type ShopifyWebhookDiscountCode = {
  code?: string | null;
  amount?: string | null;
  type?: string | null;
};

export type ShopifyWebhookOrder = {
  id: number;
  name?: string | null;
  order_number?: number | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  processed_at?: string | null;
  cancelled_at?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  currency?: string | null;
  presentment_currency?: string | null;
  subtotal_price?: string | null;
  total_tax?: string | null;
  total_shipping_price_set?: {
    shop_money?: { amount?: string | null; currency_code?: string | null };
  } | null;
  total_price?: string | null;
  total_discounts?: string | null;
  note?: string | null;
  tags?: string | null;
  order_status_url?: string | null;
  landing_site?: string | null;
  referring_site?: string | null;
  gateway?: string | null;
  payment_gateway_names?: string[] | null;
  customer?: {
    id?: number;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  billing_address?: ShopifyWebhookAddress | null;
  shipping_address?: ShopifyWebhookAddress | null;
  shipping_lines?: ShopifyWebhookShippingLine[] | null;
  discount_codes?: ShopifyWebhookDiscountCode[] | null;
  line_items?: ShopifyWebhookLineItem[] | null;
};
