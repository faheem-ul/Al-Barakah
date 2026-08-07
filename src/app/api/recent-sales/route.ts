import { NextResponse } from "next/server";

import {
  getRecentSales,
  selectSalesForPopup,
} from "@/lib/recent-sales";
import { salesPopupConfig } from "@/lib/salesPopup.config";

export const runtime = "nodejs";

/**
 * Hourly route-segment cache. Combined with unstable_cache in getRecentSales
 * so most visitors hit cache instead of Firestore.
 */
export const revalidate = 3600;

/**
 * Public recent-sales feed for the storefront popup.
 * Returns a smart subset of real purchases from the last 7 days.
 */
export const GET = async () => {
  if (!salesPopupConfig.enabled) {
    return NextResponse.json({ sales: [] });
  }

  try {
    const allSales = await getRecentSales();
    const sales = selectSalesForPopup(allSales);

    return NextResponse.json(
      { sales },
      {
        headers: {
          "Cache-Control": `s-maxage=${salesPopupConfig.cacheSeconds}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[Recent Sales API] Failed", error);

    return NextResponse.json(
      { sales: [], error: "Failed to load recent sales" },
      { status: 500 }
    );
  }
};
