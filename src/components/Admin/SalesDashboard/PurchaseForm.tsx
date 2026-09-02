"use client";

import React, { useMemo, useState } from "react";

import { money, todayIsoDate } from "@/lib/sales/calculations";
import {
  getProductByKey,
  getVariantsForProduct,
  PRODUCT_NAMES,
} from "@/lib/sales/products";
import { Button } from "@/components/ui/button";

type PurchaseFormProps = {
  onSave: (draft: {
    date: string;
    key: string;
    qty: number;
    unitPrice: number;
  }) => Promise<void>;
  saving: boolean;
};

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onSave, saving }) => {
  const [date, setDate] = useState(todayIsoDate());
  const [product, setProduct] = useState("");
  const [variantKey, setVariantKey] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  const variants = product ? getVariantsForProduct(product) : [];
  const selected = variantKey ? getProductByKey(variantKey) : undefined;

  const totalCost = useMemo(() => {
    const price = typeof unitPrice === "number" ? unitPrice : 0;
    const quantity = qty > 0 ? qty : 0;
    return price * quantity;
  }, [unitPrice, qty]);

  const resetForm = () => {
    setDate(todayIsoDate());
    setProduct("");
    setVariantKey("");
    setQty(1);
    setUnitPrice("");
  };

  const handleSave = async () => {
    if (!selected) {
      window.alert("Please select a product and variant.");
      return;
    }
    if (qty <= 0) {
      window.alert("Please enter a valid quantity.");
      return;
    }
    if (typeof unitPrice !== "number" || unitPrice <= 0) {
      window.alert("Please enter a valid unit price.");
      return;
    }

    await onSave({
      date,
      key: selected.key,
      qty,
      unitPrice,
    });

    resetForm();
  };

  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
      <h2 className="text-[19px] font-semibold mb-4">Add Stock Purchase</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Purchase Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Product</span>
          <select
            value={product}
            onChange={(e) => {
              setProduct(e.target.value);
              setVariantKey("");
            }}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          >
            <option value="">Select Product</option>
            {PRODUCT_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Variant</span>
          <select
            value={variantKey}
            onChange={(e) => setVariantKey(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
            disabled={!product}
          >
            <option value="">Select Variant</option>
            {variants.map((variant) => (
              <option key={variant.key} value={variant.key}>
                {variant.variant}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Quantity</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Unit Price (Rs.)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={unitPrice}
            onChange={(e) =>
              setUnitPrice(
                e.target.value === "" ? "" : Number(e.target.value) || 0,
              )
            }
            placeholder="Purchase cost per unit"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Total</span>
          <input
            readOnly
            value={totalCost > 0 ? money(totalCost) : ""}
            className="w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2"
          />
        </label>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        isLoading={saving}
        className="rounded-lg bg-black text-white px-5 py-2.5 text-[14px] hover:opacity-90"
      >
        Add Purchase
      </Button>
    </div>
  );
};

export default PurchaseForm;
