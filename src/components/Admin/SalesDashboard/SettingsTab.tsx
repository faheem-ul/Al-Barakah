"use client";

import React, { useState } from "react";

import { PRODUCTS } from "@/lib/sales/products";
import type { CustomExpense, NumericSettingsKey, SalesSettings } from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

type SettingsTabProps = {
  settings: SalesSettings;
  onChange: (settings: SalesSettings) => void;
  onSave: (settings: SalesSettings) => Promise<boolean>;
  saving: boolean;
};

const CUSTOMER_SHIPPING_FIELDS: {
  key: NumericSettingsKey;
  label: string;
}[] = [
  { key: "freeThreshold", label: "Free Shipping Above" },
  { key: "ship1", label: "Customer Shipping 0–1kg" },
  { key: "ship3", label: "Customer Shipping 1–3kg" },
  { key: "ship4", label: "Customer Shipping 3kg+" },
];

const PACKING_FIELDS: {
  key: NumericSettingsKey;
  label: string;
}[] = [
  { key: "packing500", label: "Packing Cost 500g" },
  { key: "packing1000", label: "Packing Cost 1kg" },
];

const ACTUAL_COURIER_FIELDS: {
  key: NumericSettingsKey;
  label: string;
}[] = [
  { key: "courierSecondDay", label: "Second Day Courier Up to 3kg" },
  {
    key: "courierSecondDayAdditional",
    label: "Second Day Additional / Kg",
  },
  { key: "fac", label: "FAC %" },
];

const OVERNIGHT_COURIER_ROWS: {
  label: string;
  halfKey: NumericSettingsKey;
  oneKey: NumericSettingsKey;
  additionalKey: NumericSettingsKey;
}[] = [
  {
    label: "Within City",
    halfKey: "courierOcWithinHalf",
    oneKey: "courierOcWithinOne",
    additionalKey: "courierOcWithinAdditional",
  },
  {
    label: "Same Zone",
    halfKey: "courierOcSameHalf",
    oneKey: "courierOcSameOne",
    additionalKey: "courierOcSameAdditional",
  },
  {
    label: "Diff. Zone",
    halfKey: "courierOcDiffHalf",
    oneKey: "courierOcDiffOne",
    additionalKey: "courierOcDiffAdditional",
  },
];

function SettingsFieldGrid({
  fields,
  settings,
  onUpdate,
}: {
  fields: { key: NumericSettingsKey; label: string }[];
  settings: SalesSettings;
  onUpdate: (key: NumericSettingsKey, raw: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {fields.map((field) => (
        <label key={field.key} className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            {field.label}
          </span>
          <input
            type="number"
            value={settings[field.key]}
            onChange={(e) => onUpdate(field.key, e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>
      ))}
    </div>
  );
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onChange,
  onSave,
  saving,
}) => {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateField = (key: NumericSettingsKey, raw: string) => {
    setSaveMessage(null);
    onChange({
      ...settings,
      [key]: Number(raw) || 0,
    });
  };

  const updateCustomExpense = (
    id: string,
    patch: Partial<Pick<CustomExpense, "name" | "amount" | "enabled">>,
  ) => {
    setSaveMessage(null);
    onChange({
      ...settings,
      customExpenses: (settings.customExpenses ?? []).map((expense) =>
        expense.id === id ? { ...expense, ...patch } : expense,
      ),
    });
  };

  const addCustomExpense = () => {
    setSaveMessage(null);
    onChange({
      ...settings,
      customExpenses: [
        ...(settings.customExpenses ?? []),
        {
          id: crypto.randomUUID(),
          name: "",
          amount: 0,
          enabled: true,
        },
      ],
    });
  };

  const removeCustomExpense = (id: string) => {
    setSaveMessage(null);
    onChange({
      ...settings,
      customExpenses: (settings.customExpenses ?? []).filter(
        (expense) => expense.id !== id,
      ),
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

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">Customer Shipping</h2>
        <SettingsFieldGrid
          fields={CUSTOMER_SHIPPING_FIELDS}
          settings={settings}
          onUpdate={updateField}
        />
        <p className="mt-4 text-[12px] text-[#6b7280]">
          Rates charged to the customer based on order weight and free-shipping
          threshold. Can be overridden per order on the order form.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">Packing Costs</h2>
        <SettingsFieldGrid
          fields={PACKING_FIELDS}
          settings={settings}
          onUpdate={updateField}
        />
        <p className="mt-4 text-[12px] text-[#6b7280]">
          Applied per unit based on variant weight — 500g or 1kg.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
        <h2 className="text-[19px] font-semibold mb-4">Actual Courier Settings</h2>

        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.zeroActualCourier}
            onChange={(e) => {
              setSaveMessage(null);
              onChange({
                ...settings,
                zeroActualCourier: e.target.checked,
              });
            }}
            className="h-4 w-4 rounded border-[#d1d5db] accent-black"
          />
          <span className="text-[14px] text-[#374151]">
            Zero Actual Courier Cost
          </span>
        </label>
        <p className="text-[12px] text-[#6b7280] mb-5">
          When enabled, Actual Courier is Rs. 0 on all upcoming orders. Use for
          orders where no courier expense applies. Disable to calculate from the
          rate card below.
        </p>

        <h3 className="text-[16px] font-semibold mb-3">
          Overnight Courier Rates
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                <th className="py-3 pr-3 font-medium">Zone</th>
                <th className="py-3 pr-3 font-medium">Up to 0.5kg</th>
                <th className="py-3 pr-3 font-medium">Up to 1kg</th>
                <th className="py-3 font-medium">Additional / 0.5kg</th>
              </tr>
            </thead>
            <tbody>
              {OVERNIGHT_COURIER_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-[#f3f4f6] last:border-b-0"
                >
                  <td className="py-3 pr-3 font-medium">{row.label}</td>
                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      value={settings[row.halfKey]}
                      onChange={(e) =>
                        updateField(row.halfKey, e.target.value)
                      }
                      className="w-full max-w-[120px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      value={settings[row.oneKey]}
                      onChange={(e) => updateField(row.oneKey, e.target.value)}
                      className="w-full max-w-[120px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      value={settings[row.additionalKey]}
                      onChange={(e) =>
                        updateField(row.additionalKey, e.target.value)
                      }
                      className="w-full max-w-[120px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-[16px] font-semibold mb-3">Second Day & FAC</h3>
        <SettingsFieldGrid
          fields={ACTUAL_COURIER_FIELDS}
          settings={settings}
          onUpdate={updateField}
        />
        <p className="mt-4 text-[12px] text-[#6b7280]">
          FAC is added as a percentage to the calculated courier charge. Second
          Day rates apply when Second Day is selected on the order form.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-[19px] font-semibold">Custom Expenses</h2>
          <Button
            type="button"
            onClick={addCustomExpense}
            className="rounded-md border border-[#e5e7eb] bg-white text-black text-[14px] px-4 py-2 hover:bg-[#f9fafb]"
          >
            Add Expense
          </Button>
        </div>

        {!settings.customExpenses?.length ? (
          <div className="rounded-lg border border-dashed border-[#d1d5db] p-8 text-center text-[#6b7280] text-[14px]">
            No custom expenses yet. Add one to include fixed per-order costs on
            the order form.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280]">
                  <th className="py-3 pr-3 font-medium">Expense Name</th>
                  <th className="py-3 pr-3 font-medium w-[140px]">
                    Amount (Rs.)
                  </th>
                  <th className="py-3 pr-3 font-medium w-[100px] text-center">
                    Enabled
                  </th>
                  <th className="py-3 font-medium w-[100px] text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {settings.customExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-[#f3f4f6] last:border-b-0"
                  >
                    <td className="py-3 pr-3">
                      <input
                        type="text"
                        maxLength={40}
                        value={expense.name}
                        onChange={(e) =>
                          updateCustomExpense(expense.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g. Handling Fee"
                        className="w-full min-w-[180px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min={0}
                        value={expense.amount}
                        onChange={(e) =>
                          updateCustomExpense(expense.id, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full max-w-[120px] rounded-lg border border-[#e5e7eb] px-3 py-2"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={expense.enabled}
                          onChange={(e) =>
                            updateCustomExpense(expense.id, {
                              enabled: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-[#d1d5db] accent-black"
                          aria-label={`Enable ${expense.name || "expense"}`}
                        />
                      </label>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeCustomExpense(expense.id)}
                        className="text-[13px] font-medium text-[#b91c1c] hover:text-[#991b1b] hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] text-[#6b7280]">
          Fixed amount per order. Check Enabled to show on the order form and
          include in calculations for upcoming orders. Uncheck to hide and
          exclude.
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
