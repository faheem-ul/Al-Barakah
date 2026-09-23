import { DEFAULT_CATALOG_PRODUCTS } from "./products";
import type { SalesSettings } from "./types";

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  catalogProducts: DEFAULT_CATALOG_PRODUCTS.map((item) => ({ ...item })),
  freeThreshold: 3500,
  ship1: 200,
  ship3: 300,
  ship4: 400,
  packing500: 110,
  packing1000: 110,
  courierOcWithinHalf: 116,
  courierOcWithinOne: 140,
  courierOcWithinAdditional: 116,
  courierOcSameHalf: 140,
  courierOcSameOne: 151,
  courierOcSameAdditional: 140,
  courierOcDiffHalf: 151,
  courierOcDiffOne: 175,
  courierOcDiffAdditional: 151,
  courierSecondDay: 300,
  courierSecondDayAdditional: 85,
  fac: 10,
  zeroActualCourier: false,
  customExpenses: [],
};
