import { getProductByKey } from "./products";
import type {
  CourierService,
  CourierZone,
  OrderPreviewResult,
  OrderStatus,
  ProductLineInput,
  ProductReportRow,
  ReturnedReportRow,
  SalesOrder,
  SalesOrderCalculation,
  SalesOrderProduct,
  SalesSettings,
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

function getSetting(settings: SalesSettings, key: keyof SalesSettings): number {
  const value = settings[key];
  return typeof value === "number" ? value : Number(value) || 0;
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
    const rates = {
      withinCity: { firstHalf: 116, firstOne: 140, additionalHalf: 116 },
      sameZone: { firstHalf: 140, firstOne: 151, additionalHalf: 140 },
      diffZone: { firstHalf: 151, firstOne: 175, additionalHalf: 151 },
    };

    const selected = rates[zone] || rates.withinCity;

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

  let customerShipping = 0;

  if (units <= 0) {
    customerShipping = 0;
  } else if (productRevenue > getSetting(settings, "freeThreshold")) {
    customerShipping = 0;
  } else if (weight <= 1) {
    customerShipping = getSetting(settings, "ship1");
  } else if (weight <= 3) {
    customerShipping = getSetting(settings, "ship3");
  } else {
    customerShipping = getSetting(settings, "ship4");
  }

  const packing = units * getSetting(settings, "packing");
  const courier =
    courierOverride > 0
      ? courierOverride
      : calculateCourier(settings, weight, service, zone);

  let revenue = 0;
  let expenses = 0;
  let netProfit = 0;

  if (status === "delivered") {
    revenue = productRevenue + customerShipping;
    expenses = honeyCost + packing + courier;
    netProfit = revenue - expenses;
  }

  if (status === "returned") {
    expenses = packing + courier;
    netProfit = -expenses;
  }

  return {
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
  };
}

export function calculateSavedProducts(
  settings: SalesSettings,
  productsData: SalesOrderProduct[],
  status: OrderStatus,
  service: CourierService = "overnight",
  zone: CourierZone = "withinCity",
): SalesOrderCalculation {
  const preview = calculateOrderPreview(
    settings,
    productsData.map((item) => ({ key: item.key, qty: item.qty })),
    status,
    0,
    service,
    zone,
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
  };
}

export function buildDashboardStats(orders: SalesOrder[], date: string) {
  const todaysOrders = orders.filter((order) => order.date === date);

  let delivered = 0;
  let returned = 0;
  let pending = 0;
  let sales = 0;
  let shipping = 0;
  let expenses = 0;
  let netProfit = 0;

  for (const order of todaysOrders) {
    if (order.status === "delivered") delivered += 1;
    if (order.status === "returned") returned += 1;
    if (order.status === "pending") pending += 1;

    if (order.status === "delivered") {
      sales += Number(order.calculation.productRevenue) || 0;
    }

    shipping +=
      order.status === "delivered" ? order.calculation.shipping : 0;
    expenses += order.calculation.expenses;
    netProfit += order.calculation.netProfit;
  }

  return {
    orders: todaysOrders,
    delivered,
    returned,
    pending,
    sales,
    shipping,
    expenses,
    netProfit,
    totalOrders: todaysOrders.length,
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
  };
}
