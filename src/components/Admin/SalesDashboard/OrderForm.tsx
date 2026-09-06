"use client";

import { X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  calculateOrderPreview,
  calculationToPreview,
  recomputeCalculationFromSnapshot,
  todayIsoDate,
} from "@/lib/sales/calculations";
import {
  getProductByKey,
  getVariantsForProduct,
  PRODUCT_NAMES,
} from "@/lib/sales/products";
import type {
  CourierService,
  CourierZone,
  OrderDraft,
  OrderStatus,
  SalesOrder,
  SalesSettings,
} from "@/lib/sales/types";
import { Button } from "@/components/ui/button";

import { BUYER_NAME_MAX_LENGTH, ORDER_DRAFT_KEY } from "./constants";
import OrderPreview from "./OrderPreview";

type ProductRow = {
  product: string;
  variantKey: string;
  qty: number;
};

type OrderFormProps = {
  settings: SalesSettings;
  editOrder?: SalesOrder | null;
  onCancelEdit?: () => void;
  onSave: (draft: {
    orderNumber: string;
    buyerName: string;
    date: string;
    status: OrderStatus;
    courierService: CourierService;
    zone: CourierZone;
    lines: { key: string; qty: number }[];
    customerShipping: number;
    actualCourier: number;
    courierTouched: boolean;
  }) => Promise<void>;
  saving: boolean;
};

const emptyRow = (): ProductRow => ({
  product: "",
  variantKey: "",
  qty: 1,
});

function loadDraft(): OrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(ORDER_DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveDraft(draft: OrderDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ORDER_DRAFT_KEY);
}

function orderToRows(order: SalesOrder): ProductRow[] {
  if (!order.products.length) return [emptyRow()];

  return order.products.map((item) => ({
    product: item.product,
    variantKey: item.key,
    qty: item.qty,
  }));
}

const OrderForm: React.FC<OrderFormProps> = ({
  settings,
  editOrder = null,
  onCancelEdit,
  onSave,
  saving,
}) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [status, setStatus] = useState<OrderStatus>("delivered");
  const [courierService, setCourierService] =
    useState<CourierService>("overnight");
  const [zone, setZone] = useState<CourierZone>("withinCity");
  const [rows, setRows] = useState<ProductRow[]>([emptyRow()]);
  const [customerShipping, setCustomerShipping] = useState(0);
  const [shippingTouched, setShippingTouched] = useState(false);
  const [actualCourier, setActualCourier] = useState(0);
  const [courierTouched, setCourierTouched] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (editOrder) {
      setOrderNumber(editOrder.orderNumber);
      setBuyerName(editOrder.buyerName);
      setDate(editOrder.date);
      setStatus(editOrder.status);
      setCourierService(editOrder.courierService);
      setZone(editOrder.zone);
      setRows(orderToRows(editOrder));
      setCustomerShipping(editOrder.calculation.shipping ?? 0);
      setShippingTouched(true);
      setActualCourier(editOrder.calculation.courier ?? 0);
      setCourierTouched(true);
      setInitialized(true);
      return;
    }

    const draft = loadDraft();
    if (draft) {
      setOrderNumber(draft.orderNumber || "");
      setBuyerName(draft.buyerName || "");
      setDate(draft.date || todayIsoDate());
      setStatus(draft.status || "delivered");
      setCourierService(draft.courierService || "overnight");
      setZone(draft.zone || "withinCity");
      setCustomerShipping(draft.customerShipping ?? 0);
      setShippingTouched(Boolean(draft.shippingTouched));
      setActualCourier(draft.actualCourier ?? 0);
      setCourierTouched(Boolean(draft.courierTouched));

      if (draft.products?.length) {
        setRows(
          draft.products.map((item) => ({
            product: item.product || "",
            variantKey: item.variant || "",
            qty: item.qty || 1,
          })),
        );
      }
    }
    setInitialized(true);
  }, [editOrder]);

  const lines = useMemo(
    () =>
      rows
        .filter((row) => row.variantKey && row.qty > 0)
        .map((row) => ({ key: row.variantKey, qty: row.qty })),
    [rows],
  );

  const suggestedDefaults = useMemo(() => {
    if (editOrder || !lines.length) {
      return { shipping: 0, courier: 0 };
    }

    const preview = calculateOrderPreview(
      settings,
      lines,
      status,
      courierService,
      zone,
    );

    return {
      shipping: preview.customerShipping,
      courier: preview.courier,
    };
  }, [editOrder, lines, settings, status, courierService, zone]);

  const displayShipping = shippingTouched
    ? customerShipping
    : suggestedDefaults.shipping;
  const displayCourier = courierTouched
    ? actualCourier
    : suggestedDefaults.courier;

  useEffect(() => {
    if (!initialized || editOrder) return;
    saveDraft({
      orderNumber,
      buyerName,
      date,
      status,
      courierService,
      zone,
      products: rows.map((row) => ({
        product: row.product,
        variant: row.variantKey,
        qty: row.qty,
      })),
      customerShipping: displayShipping,
      actualCourier: displayCourier,
      shippingTouched,
      courierTouched,
    });
  }, [
    orderNumber,
    buyerName,
    date,
    status,
    courierService,
    zone,
    rows,
    displayShipping,
    displayCourier,
    shippingTouched,
    courierTouched,
    initialized,
    editOrder,
  ]);

  const preview = useMemo(() => {
    if (!lines.length) return null;

    if (editOrder) {
      const calculation = recomputeCalculationFromSnapshot(
        editOrder.calculation,
        {
          status,
          shipping: customerShipping,
          courier: actualCourier,
        },
      );
      return calculationToPreview(calculation);
    }

    return calculateOrderPreview(
      settings,
      lines,
      status,
      courierService,
      zone,
      {
        customerShippingOverride: displayShipping,
        courierOverride: displayCourier,
      },
    );
  }, [
    settings,
    lines,
    status,
    courierService,
    zone,
    editOrder,
    displayShipping,
    displayCourier,
  ]);

  const updateRow = (index: number, patch: Partial<ProductRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    if (index === 0) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setOrderNumber("");
    setBuyerName("");
    setDate(todayIsoDate());
    setStatus("delivered");
    setCourierService("overnight");
    setZone("withinCity");
    setRows([emptyRow()]);
    setCustomerShipping(0);
    setShippingTouched(false);
    setActualCourier(0);
    setCourierTouched(false);
    clearDraft();
  };

  const handleSave = async () => {
    if (!orderNumber.trim()) {
      window.alert("Please enter order number.");
      return;
    }
    if (!buyerName.trim()) {
      window.alert("Please enter buyer name.");
      return;
    }
    if (!lines.length) {
      window.alert("Please select a product and variant.");
      return;
    }

    await onSave({
      orderNumber: orderNumber.trim(),
      buyerName: buyerName.trim(),
      date,
      status,
      courierService,
      zone,
      lines,
      customerShipping: displayShipping,
      actualCourier: displayCourier,
      courierTouched,
    });

    if (!editOrder) {
      resetForm();
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 mb-5">
      <h2 className="text-[19px] font-semibold mb-4">
        {editOrder ? "Edit Order" : "Add New Order"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Order Number
          </span>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="#1001"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Order Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Buyer Name
          </span>
          <input
            value={buyerName}
            onChange={(e) =>
              setBuyerName(
                e.target.value.slice(0, BUYER_NAME_MAX_LENGTH),
              )
            }
            maxLength={BUYER_NAME_MAX_LENGTH}
            placeholder="Customer name"
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          >
            <option value="delivered">Delivered</option>
            <option value="pending">Pending</option>
            <option value="returned">Returned</option>
            <option value="promotional">Promotional Giveaway</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Courier Service
          </span>
          <select
            value={courierService}
            onChange={(e) =>
              setCourierService(e.target.value as CourierService)
            }
            disabled={Boolean(editOrder)}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
          >
            <option value="overnight">Overnight</option>
            <option value="secondDay">Second Day</option>
          </select>
        </label>

        {courierService === "overnight" && (
          <label className="block">
            <span className="text-[13px] text-[#6b7280] mb-1 block">
              Overnight Zone
            </span>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value as CourierZone)}
              disabled={Boolean(editOrder)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
            >
              <option value="withinCity">Within City</option>
              <option value="sameZone">Same Zone</option>
              <option value="diffZone">Diff. Zone</option>
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Customer Shipping (Rs.)
          </span>
          <input
            type="number"
            min={0}
            value={editOrder ? customerShipping : displayShipping}
            onChange={(e) => {
              setShippingTouched(true);
              setCustomerShipping(Number(e.target.value) || 0);
            }}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-[#6b7280] mb-1 block">
            Actual Courier (Rs.)
          </span>
          <input
            type="number"
            min={0}
            value={editOrder ? actualCourier : displayCourier}
            onChange={(e) => {
              setCourierTouched(true);
              setActualCourier(Number(e.target.value) || 0);
            }}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2"
          />
        </label>
      </div>
      <p className="text-[12px] text-[#6b7280] mb-4">
        {editOrder
          ? "Customer shipping and actual courier can be adjusted for this order. Other costs use the saved snapshot from when the order was created."
          : "Customer shipping and actual courier default from Settings based on order weight and courier zone. Edit to override for this order."}
      </p>

      <div className="space-y-3 mb-4">
        {rows.map((row, index) => {
          const variants = row.product
            ? getVariantsForProduct(row.product)
            : [];
          const selected = row.variantKey
            ? getProductByKey(row.variantKey)
            : undefined;
          const price = selected
            ? settings[selected.priceKey]
            : undefined;

          return (
            <div
              key={index}
              className={`grid grid-cols-1 gap-3 items-end ${
                editOrder
                  ? "md:grid-cols-[1fr_1fr_100px]"
                  : "md:grid-cols-[1fr_1fr_100px_100px_32px]"
              }`}
            >
              <label className="block">
                <span className="text-[12px] text-[#6b7280] mb-1 block">
                  Product
                </span>
                <select
                  value={row.product}
                  onChange={(e) =>
                    updateRow(index, {
                      product: e.target.value,
                      variantKey: "",
                    })
                  }
                  disabled={Boolean(editOrder)}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
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
                <span className="text-[12px] text-[#6b7280] mb-1 block">
                  Variant
                </span>
                <select
                  value={row.variantKey}
                  onChange={(e) =>
                    updateRow(index, { variantKey: e.target.value })
                  }
                  disabled={Boolean(editOrder)}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
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
                <span className="text-[12px] text-[#6b7280] mb-1 block">
                  Qty
                </span>
                <input
                  type="number"
                  min={1}
                  value={row.qty}
                  onChange={(e) =>
                    updateRow(index, {
                      qty: Number(e.target.value) || 0,
                    })
                  }
                  disabled={Boolean(editOrder)}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
                />
              </label>

              {!editOrder && (
                <label className="block">
                  <span className="text-[12px] text-[#6b7280] mb-1 block">
                    Price
                  </span>
                  <input
                    readOnly
                    value={
                      price
                        ? `Rs. ${Number(price).toLocaleString("en-PK")}`
                        : ""
                    }
                    className="w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2"
                  />
                </label>
              )}

              {!editOrder && (
                <div className="flex flex-col justify-end">
                  <div className="flex h-[42px] items-center justify-center">
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label="Remove product"
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-[#b91c1c] text-white hover:opacity-90"
                      >
                        <X className="size-3.5 shrink-0" strokeWidth={2.5} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!editOrder && (
        <Button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-[#f3f4f6] text-[#374151] px-4 py-2 text-[14px] hover:opacity-90 mb-4"
        >
          + Add Product
        </Button>
      )}

      <OrderPreview result={preview} status={status} />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleSave}
          isLoading={saving}
          className="rounded-lg bg-black text-white px-5 py-2.5 text-[14px] hover:opacity-90"
        >
          {editOrder ? "Update Order" : "Save Order"}
        </Button>
        {editOrder && (
          <Button
            type="button"
            onClick={handleCancelEdit}
            disabled={saving}
            className="rounded-lg bg-[#f3f4f6] text-[#374151] px-5 py-2.5 text-[14px] hover:opacity-90"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrderForm;
