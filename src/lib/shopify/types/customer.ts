export type Customer = {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  acceptsMarketing?: boolean;
  accessToken?: string;
  expiresAt?: string;
};

export type CustomerProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  createdAt: string;
  addresses: {
    nodes: Array<{
      address1: string;
      address2: string;
      city: string;
      country: string;
      firstName: string;
      lastName: string;
      id: string;
      name: string;
      phone: string;
      province: string;
      zip: string;
    }>;
  };
};

export type CustomerAddress = {
  address1: string;
  address2: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  id: string;
  name: string;
  phone: string;
  province: string;
  zip: string;
};

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  createdAt: string;
  address?: CustomerAddress;
};

export type CustomerAddressInput = {
  address1: string;
  address2: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  phone: string;
  zip: string;
  province?: string | null;
};

type CustomerUserErrors = {
  code: string;
  field: string[];
};

export type CustomerProfileAndAddressUpdateOperation = {
  data: {
    customerAddressUpdate: {
      customerAddress: CustomerAddress;
    };
    customerUpdate: {
      customer: Customer;
    };
  };
  variables: {
    address: CustomerAddressInput;
    id: string;
    customerAccessToken: string;
    firstName: string;
    lastName: string;
  };
};

export type CustomerProfileUpdateAndAddressCreateOperation = {
  data: {
    customerAddressUpdate: {
      customerAddress: CustomerAddress;
    };
    customerUpdate: {
      customer: Customer;
    };
  };
  variables: {
    address: CustomerAddressInput;
    customerAccessToken: string;
    firstName: string;
    lastName: string;
  };
};

export type CustomerUpdate = {
  customerAddress: CustomerAddress;
  customer: Customer;
};

export type CustomerCreateOperation = {
  data: {
    customerCreate: {
      customer: Customer;
      customerUserErrors: CustomerUserErrors[];
    };
  };
  // variables: { input:Customer }
  variables: Customer;
};

export type CustomerGetProfileOperation = {
  data: {
    customer: CustomerProfileData;
  };
  // variables: { input:Customer }
  variables: { accessToken: string };
};

export type CustomerAccessToken = {
  accessToken: string;
  expiresAt: string;
};

export type CustomerLoginOperation = {
  data: {
    customerAccessTokenCreate: {
      customerAccessToken: CustomerAccessToken;
      customerUserErrors: CustomerUserErrors[];
    };
  };
  // variables: { input:Customer }
  variables: { email: string; password: string };
};

export type SessionData = {
  accessToken?: string;
  expirationDate?: string;
  isLoggedIn: boolean;
};

//* order types
export type CustomerGetOrdersOperation = {
  data: {
    customer: CustomerProfileData & {
      orders: Orders;
    };
  };
  variables: {
    accessToken: string;
  };
};

export type CustomerOrder = {
  title: string;
  image: {
    id: string;
    altText: string;
    url: string;
  };
  quantity: number;
  originalTotalPrice: {
    amount: string;
    currencyCode: string;
  };
};

export type Orders = {
  edges: OrderEdge[];
};

export type OrderEdge = {
  node: OrderNode;
};

export type OrderNode = {
  lineItems: LineItems;
};

export type LineItems = {
  edges: LineItemEdge[];
};

export type LineItemEdge = {
  node: LineItemNode;
};

export type LineItemNode = {
  title: string;
  variant: Variant;
  currentQuantity: number;
  quantity: number;
  originalTotalPrice: Price;
};

export type Variant = {
  image: Image;
};

type Image = {
  id: string;
  altText: string | null;
  url: string;
};

export type Price = {
  amount: string;
  currencyCode: string;
};

//* order types
