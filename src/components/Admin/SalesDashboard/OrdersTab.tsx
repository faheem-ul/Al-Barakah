"use client";

import React, { useCallback, useMemo, useState } from "react";

import { calculateSavedProducts } from "@/lib/sales/calculations";
import { createSalesOrder, deleteSalesOrder } from "@/lib/sales/orders";
import { getProductByKey } from "@/lib/sales/products";
import type {
  CourierService,
  CourierZone,
  OrderStatus,
  SalesOrder,
  SalesSettings,
} from "@/lib/sales/types";

import OrderForm from "./OrderForm";
import OrdersTable from "./OrdersTable";

type OrdersTabProps = {
  settings: SalesSettings;
  orders: SalesOrder[];
  onOrdersChange: (orders: SalesOrder[]) => void;
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  settings,
  orders,
  onOrdersChange,
}) => {
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [orders],
  );

  const handleSave = useCallback(
    async (draft: {
      orderNumber: string;
      date: string;
      status: OrderStatus;
      courierService: CourierService;
      zone: CourierZone;
      lines: { key: string; qty: number }[];
    }) => {
      setSaving(true);
      try {
        const productsData = draft.lines
          .map((line) => {
            const product = getProductByKey(line.key);
            if (!product) return null;
            return {
              product: product.product,
              variant: product.variant,
              key: product.key,
              qty: line.qty,
            };
          })
          .filter(Boolean) as SalesOrder["products"];

        const calculation = calculateSavedProducts(
          settings,
          productsData,
          draft.status,
          draft.courierService,
          draft.zone,
        );

        const payload = {
          orderNumber: draft.orderNumber,
          date: draft.date,
          status: draft.status,
          courierService: draft.courierService,
          zone: draft.zone,
          products: productsData,
          calculation,
          createdAt: Date.now(),
        };

        const id = await createSalesOrder(payload);
        onOrdersChange([{ id, ...payload }, ...orders]);
        window.alert("Order saved successfully.");
      } catch (error) {
        console.error("Failed to save order", error);
        window.alert("Failed to save order. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [settings, orders, onOrdersChange],
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this order?")) return;
    setDeletingId(id);
    try {
      await deleteSalesOrder(id);
      onOrdersChange(orders.filter((order) => order.id !== id));
    } catch (error) {
      console.error("Failed to delete order", error);
      window.alert("Failed to delete order. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <OrderForm settings={settings} onSave={handleSave} saving={saving} />

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <h2 className="text-[19px] font-semibold mb-4">All Orders</h2>
        <OrdersTable
          orders={sortedOrders}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </div>
    </div>
  );
};

export default OrdersTab;
