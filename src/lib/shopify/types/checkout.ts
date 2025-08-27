export type CheckoutCreateInput = {
  lineItems: LineItem[];
  email?: string;
  shippingAddress?: CheckoutCustomerAddress;
};

export type LineItem = {
  variantId: string;
  quantity: number;
};

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CheckoutCustomerAddress = {
  address1: string;
  address2: string;
  city: string;
  company?: string;
  country: string;
  firstName: string;
  lastName: string;
  phone: string;
  zip: string;
  province?: string;
};
