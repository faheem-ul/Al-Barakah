import { getProductByKey } from "./products";
import type {
  AppliedCustomExpense,
  CourierService,
  CourierZone,
  OrderPreviewResult,
  OrderStatus,
  ProductLineInput,
  ProductReportRow,
  PromotionalReportRow,
  ReturnedReportRow,
  SalesOrder,
  SalesOrderCalculation,
  SalesOrderProduct,
  SalesSettings,
  NumericSettingsKey,
  OrderPreviewOptions,
} from "./types";

export function money(value: number | undefined | null): string {
  return `Rs. ${Math.round(value || 0).toLocaleString("en-PK")}`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7);
}

function getSetting(settings: SalesSettings, key: NumericSettingsKey): number {
  const value = settings[key];
  return typeof value === "number" ? value : Number(value) || 0;
}

export function getEnabledCustomExpenses(
  settings: SalesSettings,
): AppliedCustomExpense[] {
  return (settings.customExpenses ?? [])
    .filter((expense) => expense.enabled && expense.name.trim() && expense.amount > 0)
    .map(({ id, name, amount }) => ({
      id,
      name: name.trim(),
      amount,
    }));
}

function sumCustomExpenses(customExpenses: AppliedCustomExpense[]): number {
  return customExpenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function applyPreservedCustomExpenses(
  preview: OrderPreviewResult,
  preservedCustomExpenses: AppliedCustomExpense[],
  status: OrderStatus,
): OrderPreviewResult {
  const customExpensesTotal = sumCustomExpenses(preservedCustomExpenses);
  const baseExpenses = preview.expenses - preview.customExpensesTotal;
  const expenses = baseExpenses + customExpensesTotal;

  let netProfit = preview.netProfit;

  if (status === "delivered") {
    netProfit = preview.revenue - expenses;
  } else if (
    status === "returned" ||
    status === "promotional" ||
    status === "pending"
  ) {
    netProfit = -expenses;
  }

  return {
    ...preview,
    customExpenses: preservedCustomExpenses,
    customExpensesTotal,
    expenses,
    netProfit,
  };
}

function getOvernightZoneRates(
  settings: SalesSettings,
  zone: CourierZone,
): { firstHalf: number; firstOne: number; additionalHalf: number } {
  if (zone === "sameZone") {
    return {
      firstHalf: getSetting(settings, "courierOcSameHalf"),
      firstOne: getSetting(settings, "courierOcSameOne"),
      additionalHalf: getSetting(settings, "courierOcSameAdditional"),
    };
  }

  if (zone === "diffZone") {
    return {
      firstHalf: getSetting(settings, "courierOcDiffHalf"),
      firstOne: getSetting(settings, "courierOcDiffOne"),
      additionalHalf: getSetting(settings, "courierOcDiffAdditional"),
    };
  }

  return {
    firstHalf: getSetting(settings, "courierOcWithinHalf"),
    firstOne: getSetting(settings, "courierOcWithinOne"),
    additionalHalf: getSetting(settings, "courierOcWithinAdditional"),
  };
}

export function calculatePackingCost(
  settings: SalesSettings,
  lines: ProductLineInput[],
): number {
  let packing = 0;

  for (const line of lines) {
    const product = getProductByKey(line.key);
    if (!product || line.qty <= 0) continue;

    const rate =
      product.weight <= 0.5
        ? getSetting(settings, "packing500")
        : getSetting(settings, "packing1000");
    packing += line.qty * rate;
  }

  return packing;
}

export function calculateDefaultCustomerShipping(
  settings: SalesSettings,
  lines: ProductLineInput[],
): number {
  let productRevenue = 0;
  let weight = 0;
  let units = 0;

  for (const line of lines) {
    const product = getProductByKey(line.key);
    if (!product || line.qty <= 0) continue;

    productRevenue += line.qty * getSetting(settings, product.priceKey);
    weight += line.qty * product.weight;
    units += line.qty;
  }

  if (units <= 0) return 0;
  if (productRevenue > getSetting(settings, "freeThreshold")) return 0;
  if (weight <= 1) return getSetting(settings, "ship1");
  if (weight <= 3) return getSetting(settings, "ship3");
  return getSetting(settings, "ship4");
}

function resolveCustomerShipping(
  settings: SalesSettings,
  lines: ProductLineInput[],
  options?: OrderPreviewOptions,
): number {
  if (options?.customerShippingOverride !== undefined) {
    return Math.max(0, options.customerShippingOverride);
  }

  return calculateDefaultCustomerShipping(settings, lines);
}

function rebuildDeliveredTotals(
  preview: OrderPreviewResult,
  customerShipping: number,
): OrderPreviewResult {
  const revenue = preview.productRevenue + customerShipping;
  const netProfit = revenue - preview.expenses;

  return {
    ...preview,
    customerShipping,
    revenue,
    netProfit,
  };
}

export function calculateCourier(
  settings: SalesSettings,
  weight: number,
  service: CourierService = "overnight",
  zone: CourierZone = "withinCity",
): number {
  const fac = getSetting(settings, "fac");

  if (weight <= 0) return 0;

  let baseCourier = 0;

  if (service === "secondDay") {
    baseCourier = getSetting(settings, "courierSecondDay");

    if (weight > 3) {
      baseCourier +=
        Math.ceil(weight - 3) *
        getSetting(settings, "courierSecondDayAdditional");
    }
  } else {
    const selected = getOvernightZoneRates(settings, zone);

    if (weight <= 0.5) {
      baseCourier = selected.firstHalf;
    } else if (weight <= 1) {
      baseCourier = selected.firstOne;
    } else {
      const additionalHalfKg = Math.ceil((weight - 1) / 0.5);
      baseCourier =
        selected.firstOne + additionalHalfKg * selected.additionalHalf;
    }
  }

  return baseCourier + (baseCourier * fac) / 100;
}

export function calculateOrderPreview(
  settings: SalesSettings,
  lines: ProductLineInput[],
  status: OrderStatus = "delivered",
  courierOverride = 0,
  service: CourierService = "overnight",
  zone: CourierZone = "withinCity",
  options?: OrderPreviewOptions,
): OrderPreviewResult {
  let productRevenue = 0;
  let honeyCost = 0;
  let weight = 0;
  let units = 0;

  for (const line of lines) {
    const product = getProductByKey(line.key);
    const qty = line.qty;

    if (!product || qty <= 0) continue;

    productRevenue += qty * getSetting(settings, product.priceKey);
    honeyCost += qty * getSetting(settings, product.costKey);
    weight += qty * product.weight;
    units += qty;
  }

  const customerShipping = resolveCustomerShipping(settings, lines, options);
  const packing = calculatePackingCost(settings, lines);
  const courier = settings.zeroActualCourier
    ? 0
    : courierOverride > 0
      ? courierOverride
      : calculateCourier(settings, weight, service, zone);

  let revenue = 0;
  let expenses = 0;
  let netProfit = 0;
  let customExpenses: AppliedCustomExpense[] = [];
  let customExpensesTotal = 0;

  const appliesCustomExpenses =
    status === "delivered" ||
    status === "returned" ||
    status === "promotional";

  if (appliesCustomExpenses) {
    customExpenses = getEnabledCustomExpenses(settings);
    customExpensesTotal = customExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
  }

  if (status === "delivered") {
    revenue = productRevenue + customerShipping;
    expenses = honeyCost + packing + courier + customExpensesTotal;
    netProfit = revenue - expenses;
  }

  if (status === "returned") {
    expenses = packing + courier + customExpensesTotal;
    netProfit = -expenses;
  }

  if (status === "promotional") {
    revenue = 0;
    expenses = honeyCost + packing + courier + customExpensesTotal;
    netProfit = -expenses;
  }

  let preview: OrderPreviewResult = {
    productRevenue,
    honeyCost,
    weight,
    units,
    customerShipping,
    packing,
    courier,
    revenue,
    expenses,
    netProfit,
    customExpenses,
    customExpensesTotal,
  };

  if (status === "delivered") {
    preview = rebuildDeliveredTotals(preview, customerShipping);
  }

  if (options?.preservedCustomExpenses !== undefined) {
    preview = applyPreservedCustomExpenses(
      preview,
      options.preservedCustomExpenses,
      status,
    );
  }

  return preview;
}

export function calculateSavedProducts(
  settings: SalesSettings,
  productsData: SalesOrderProduct[],
  status: OrderStatus,
  service: CourierService = "overnight",
  zone: CourierZone = "withinCity",
  options?: OrderPreviewOptions,
): SalesOrderCalculation {
  const preview = calculateOrderPreview(
    settings,
    productsData.map((item) => ({ key: item.key, qty: item.qty })),
    status,
    0,
    service,
    zone,
    options,
  );

  return {
    productRevenue: preview.productRevenue,
    shipping: preview.customerShipping,
    weight: preview.weight,
    units: preview.units,
    honeyCost: preview.honeyCost,
    packing: preview.packing,
    courier: preview.courier,
    revenue: preview.revenue,
    expenses: preview.expenses,
    netProfit: preview.netProfit,
    customExpenses: preview.customExpenses,
  };
}

export function buildDashboardStats(orders: SalesOrder[], month: string) {
  const monthOrders = orders
    .filter((order) => String(order.date || "").startsWith(month))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  let delivered = 0;
  let returned = 0;
  let pending = 0;
  let promotional = 0;
  let sales = 0;
  let shipping = 0;
  let expenses = 0;
  let netProfit = 0;

  for (const order of monthOrders) {
    if (order.status === "delivered") delivered += 1;
    if (order.status === "returned") returned += 1;
    if (order.status === "pending") pending += 1;
    if (order.status === "promotional") promotional += 1;

    if (order.status === "delivered") {
      sales += Number(order.calculation.productRevenue) || 0;
    }

    shipping +=
      order.status === "delivered" ? order.calculation.shipping : 0;
    expenses += order.calculation.expenses;
    netProfit += order.calculation.netProfit;
  }

  return {
    orders: monthOrders,
    delivered,
    returned,
    pending,
    promotional,
    sales,
    shipping,
    expenses,
    netProfit,
    totalOrders: monthOrders.length,
  };
}

export function buildMonthlyReport(
  settings: SalesSettings,
  orders: SalesOrder[],
  month: string,
) {
  const monthOrders = orders.filter((order) =>
    String(order.date || "").startsWith(month),
  );

  let sales = 0;
  let expenses = 0;
  let netProfit = 0;

  const productStats: Record<string, ProductReportRow> = {};
  const returnedStats: Record<string, ReturnedReportRow> = {};
  const promotionalStats: Record<string, PromotionalReportRow> = {};
  let promotionalExpense = 0;
  let returnedExpense = 0;

  for (const order of monthOrders) {
    const calculation = order.calculation;
    const status = order.status;

    if (status === "delivered") {
      sales += Number(calculation.productRevenue) || 0;

      for (const item of order.products) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;

        const key = item.key || `${item.product}|${item.variant}`;

        if (!productStats[key]) {
          productStats[key] = {
            product: item.product || "Unknown",
            variant: item.variant || "",
            qty: 0,
            revenue: 0,
          };
        }

        productStats[key].qty += qty;

        const product = getProductByKey(item.key);
        if (product) {
          productStats[key].revenue +=
            qty * getSetting(settings, product.priceKey);
        }
      }
    }

    if (status === "returned") {
      returnedExpense += Number(calculation.expenses) || 0;

      for (const item of order.products) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;

        const key = item.key || `${item.product}|${item.variant}`;

        if (!returnedStats[key]) {
          returnedStats[key] = {
            product: item.product || "Unknown",
            variant: item.variant || "",
            qty: 0,
          };
        }

        returnedStats[key].qty += qty;
      }
    }

    if (status === "promotional") {
      promotionalExpense += Number(calculation.expenses) || 0;

      for (const item of order.products) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;

        const key = item.key || `${item.product}|${item.variant}`;

        if (!promotionalStats[key]) {
          promotionalStats[key] = {
            product: item.product || "Unknown",
            variant: item.variant || "",
            qty: 0,
            expense: 0,
          };
        }

        promotionalStats[key].qty += qty;

        const product = getProductByKey(item.key);
        if (product) {
          promotionalStats[key].expense +=
            qty * getSetting(settings, product.costKey);
        }
      }
    }

    expenses += Number(calculation.expenses) || 0;
    netProfit += Number(calculation.netProfit) || 0;
  }

  return {
    monthOrders,
    sales,
    expenses,
    netProfit,
    productRows: Object.values(productStats),
    returnedRows: Object.values(returnedStats),
    returnedExpense,
    promotionalRows: Object.values(promotionalStats),
    promotionalExpense,
  };
}
