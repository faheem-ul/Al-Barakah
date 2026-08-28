"use client";

import React, { useState } from "react";

import { PRODUCTS } from "@/lib/sales/products";
import type { SalesSettings } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type SettingsTabProps = {
  settings: SalesSettings;
  onChange: (settings: SalesSettings) => void;
  onSave: (settings: SalesSettings) => Promise<boolean>;
  saving: boolean;
};

const SHIPPING_FIELDS: {
  key: keyof SalesSettings;
  label: string;
}[] = [
  { key: "freeThreshold", label: "Free Shipping Above" },
  { key: "ship1", label: "Customer Shipping 0–1kg" },
  { key: "ship3", label: "Customer Shipping 1–3kg" },
  { key: "ship4", label: "Customer Shipping 3kg+" },
  { key: "packing", label: "Packing Cost / Unit" },
  { key: "courierSecondDay", label: "Second Day Courier Up to 3kg" },
  {
    key: "courierSecondDayAdditional",
    label: "Second Day Additional / Kg",
  },
  { key: "fac", label: "FAC %" },
];

const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onChange,
  onSave,
  saving,
}) => {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateField = (key: keyof SalesSettings, raw: string) => {
    setSaveMessage(null);
    onChange({
      ...settings,
      [key]: Number(raw) || 0,
    });
  };

  const handleSave = async () => {
    setSaveMessage(null);
    const ok = await onSave(settings);
    setSaveMessage(
      ok
        ? "Settings saved to Firestore."
        : "Failed to save settings. Check Firestore rules for sales-settings.",
    );
  };

  return (
    <div>
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">
          Product Pricing & Purchase Costs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                <th className="py-3 pr-3 font-medium">Product</th>
                <th className="py-3 pr-3 font-medium">Variant</th>
                <th className="py-3 pr-3 font-medium">Selling Price</th>
                <th className="py-3 font-medium">Purchase Price</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => (
                <tr key={product.key} className="border-b border-[#f3f4f6]">
                  <td className="py-3 pr-3">{product.product}</td>
                  <td className="py-3 pr-3">{product.variant}</td>
                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      value={settings[product.priceKey]}
                      onChange={(e) =>
                        updateField(product.priceKey, e.target.value)
                      }
                      className="w-full max-w-[140px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      value={settings[product.costKey]}
                      onChange={(e) =>
                        updateField(product.costKey, e.target.value)
                      }
                      className="w-full max-w-[140px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <h2 className="text-[19px] font-semibold mb-4">
          Shipping & Courier Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHIPPING_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="text-[13px] text-[#6b7280] mb-1 block">
                {field.label}
              </span>
              <input
                type="number"
                value={settings[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-[#6b7280]">
          Overnight rates follow the supplied rate card. Second Day is Rs. 300 up
          to 3kg plus Rs. 85 per additional kg. FAC is added at the configured
          percentage (default 10%) to the courier charge. Returned orders use
          the same Packing Cost / Unit and Actual Courier only.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void handleSave()}
            isLoading={saving}
            className="rounded-md bg-black text-white text-[14px] px-5 py-2.5 hover:opacity-90"
          >
            Save Settings
          </Button>
          {saveMessage && (
            <p
              className={`text-[13px] ${
                saveMessage.includes("saved")
                  ? "text-[#047857]"
                  : "text-[#b91c1c]"
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
