export type SalesTab =
  | "dashboard"
  | "orders"
  | "reports"
  | "stock"
  | "settings";

export type OrderStatus = "delivered" | "returned" | "pending" | "promotional";
export type CourierService = "overnight" | "secondDay";
export type CourierZone = "withinCity" | "sameZone" | "diffZone";

export type CustomExpense = {
  id: string;
  name: string;
  amount: number;
  enabled: boolean;
};

export type AppliedCustomExpense = {
  id: string;
  name: string;
  amount: number;
};

export type SalesSettings = {
  p_m500: number;
  c_m500: number;
  p_m1000: number;
  c_m1000: number;
  p_f500: number;
  c_f500: number;
  p_f1000: number;
  c_f1000: number;
  p_s500: number;
  c_s500: number;
  p_s1000: number;
  c_s1000: number;
  freeThreshold: number;
  ship1: number;
  ship3: number;
  ship4: number;
  packing500: number;
  packing1000: number;
  courierOcWithinHalf: number;
  courierOcWithinOne: number;
  courierOcWithinAdditional: number;
  courierOcSameHalf: number;
  courierOcSameOne: number;
  courierOcSameAdditional: number;
  courierOcDiffHalf: number;
  courierOcDiffOne: number;
  courierOcDiffAdditional: number;
  courierSecondDay: number;
  courierSecondDayAdditional: number;
  fac: number;
  zeroActualCourier: boolean;
  customExpenses: CustomExpense[];
  updatedAt?: number;
};

export type NumericSettingsKey = Exclude<
  keyof SalesSettings,
  "customExpenses" | "updatedAt" | "zeroActualCourier"
>;

export type SalesOrderProduct = {
  product: string;
  variant: string;
  key: string;
  qty: number;
};

export type SalesOrderCalculation = {
  productRevenue: number;
  shipping: number;
  weight: number;
  units: number;
  honeyCost: number;
  packing: number;
  courier: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  customExpenses?: AppliedCustomExpense[];
};

export type SalesOrder = {
  id: string;
  orderNumber: string;
  buyerName: string;
  date: string;
  status: OrderStatus;
  courierService: CourierService;
  zone: CourierZone;
  products: SalesOrderProduct[];
  calculation: SalesOrderCalculation;
  freeDelivery?: boolean;
  createdAt: number;
};

export type SalesOrderPayload = Omit<SalesOrder, "id">;

export type OrderDraftProduct = {
  product: string;
  variant: string;
  qty: number;
};

export type OrderDraft = {
  orderNumber: string;
  buyerName: string;
  date: string;
  status: OrderStatus;
  courierService: CourierService;
  zone: CourierZone;
  products: OrderDraftProduct[];
  customerShipping?: number;
  actualCourier?: number;
  shippingTouched?: boolean;
  courierTouched?: boolean;
};

export type OrderPreviewOptions = {
  customerShippingOverride?: number;
  courierOverride?: number;
  preservedCustomExpenses?: AppliedCustomExpense[];
};

export type ProductLineInput = {
  key: string;
  qty: number;
};

export type OrderPreviewResult = {
  productRevenue: number;
  honeyCost: number;
  weight: number;
  units: number;
  customerShipping: number;
  packing: number;
  courier: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  customExpenses: AppliedCustomExpense[];
  customExpensesTotal: number;
};

export type ProductReportRow = {
  product: string;
  variant: string;
  qty: number;
  revenue: number;
};

export type ReturnedReportRow = {
  product: string;
  variant: string;
  qty: number;
};

export type PromotionalReportRow = {
  product: string;
  variant: string;
  qty: number;
  expense: number;
};

export type StockPurchase = {
  id: string;
  date: string;
  product: string;
  variant: string;
  key: string;
  qty: number;
  unitPrice: number;
  totalCost: number;
  createdAt: number;
};

export type StockPurchasePayload = Omit<StockPurchase, "id">;
