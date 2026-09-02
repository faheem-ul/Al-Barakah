"use client";

import React, { useCallback, useEffect, useState } from "react";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import Spinner from "@/components/ui/Spinner";
import { DEFAULT_SALES_SETTINGS } from "@/lib/sales/defaults";
import { getAllSalesOrders } from "@/lib/sales/orders";
import { getAllStockPurchases } from "@/lib/sales/purchases";
import { getSalesSettings, saveSalesSettings } from "@/lib/sales/settings";
import type {
  SalesOrder,
  SalesSettings,
  SalesTab,
  StockPurchase,
} from "@/lib/sales/types";

import DashboardTab from "./DashboardTab";
import OrdersTab from "./OrdersTab";
import ReportsTab from "./ReportsTab";
import SalesHeader from "./SalesHeader";
import SalesSheet from "./SalesSheet";
import SalesSidebar from "./SalesSidebar";
import SettingsTab from "./SettingsTab";
import StockTab from "./StockTab";

const SalesDashboard: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [tab, setTab] = useState<SalesTab>("dashboard");
  const [settings, setSettings] = useState<SalesSettings>(DEFAULT_SALES_SETTINGS);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    let settingsResult = DEFAULT_SALES_SETTINGS;
    let ordersResult: SalesOrder[] = [];
    let purchasesResult: StockPurchase[] = [];
    const errors: string[] = [];

    try {
      settingsResult = await getSalesSettings();
    } catch (error) {
      console.error("Failed to load sales settings", error);
      errors.push("Could not load settings from Firestore. Using defaults.");
    }

    try {
      ordersResult = await getAllSalesOrders();
    } catch (error) {
      console.error("Failed to load sales orders", error);
      errors.push("Could not load orders from Firestore.");
    }

    try {
      purchasesResult = await getAllStockPurchases();
    } catch (error) {
      console.error("Failed to load stock purchases", error);
      errors.push("Could not load stock purchases from Firestore.");
    }

    setSettings(settingsResult);
    setOrders(ordersResult);
    setPurchases(purchasesResult);
    setLoadError(errors.length ? errors.join(" ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveSettings = async (next: SalesSettings): Promise<boolean> => {
    setSavingSettings(true);
    try {
      await saveSalesSettings(next);
      setSettings(next);
      setLoadError(null);
      return true;
    } catch (error) {
      console.error("Failed to save settings", error);
      setLoadError(
        "Failed to save settings. Check Firestore rules for sales-settings.",
      );
      return false;
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen overflow-hidden flex items-center justify-center bg-[#F7F7F7]">
        <Spinner fill="#000000" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F7F7] flex overflow-hidden">
      <SalesSidebar tab={tab} onTabChange={setTab} />

      <SalesSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        tab={tab}
        onTabChange={setTab}
        onLogout={logout}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <SalesHeader
          email={user?.email}
          onOpenMenu={() => setMenuOpen(true)}
          onLogout={logout}
        />

        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-light px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-[1250px] mx-auto w-full">
            {loadError && (
              <div className="mb-4 rounded-xl border border-[#fcd34d] bg-[#fffbeb] px-4 py-3 text-[14px] text-[#92400e]">
                {loadError}{" "}
                <button
                  type="button"
                  onClick={() => void load()}
                  className="underline font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {tab === "dashboard" && <DashboardTab orders={orders} />}
            {tab === "orders" && (
              <OrdersTab
                settings={settings}
                orders={orders}
                onOrdersChange={setOrders}
              />
            )}
            {tab === "reports" && (
              <ReportsTab settings={settings} orders={orders} />
            )}
            {tab === "stock" && (
              <StockTab
                purchases={purchases}
                onPurchasesChange={setPurchases}
              />
            )}
            {tab === "settings" && (
              <SettingsTab
                settings={settings}
                onChange={setSettings}
                onSave={handleSaveSettings}
                saving={savingSettings}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SalesDashboard;
