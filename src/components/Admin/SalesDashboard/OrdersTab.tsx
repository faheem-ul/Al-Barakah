"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { calculateSavedProducts } from "@/lib/sales/calculations";
import {
  createSalesOrder,
  deleteSalesOrder,
  updateSalesOrder,
} from "@/lib/sales/orders";
import { getProductByKey } from "@/lib/sales/products";
import type {
  AppliedCustomExpense,
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

type OrderDraftInput = {
  orderNumber: string;
  buyerName: string;
  date: string;
  status: OrderStatus;
  courierService: CourierService;
  zone: CourierZone;
  lines: { key: string; qty: number }[];
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  settings,
  orders,
  onOrdersChange,
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [orders],
  );

  const buildOrderPayload = useCallback(
    (
      draft: OrderDraftInput,
      createdAt: number,
      preservedCustomExpenses?: AppliedCustomExpense[],
    ) => {
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
        preservedCustomExpenses,
      );

      return {
        orderNumber: draft.orderNumber,
        buyerName: draft.buyerName,
        date: draft.date,
        status: draft.status,
        courierService: draft.courierService,
        zone: draft.zone,
        products: productsData,
        calculation,
        createdAt,
      };
    },
    [settings],
  );

  const handleSave = useCallback(
    async (draft: OrderDraftInput) => {
      setSaving(true);
      try {
        if (editingOrder) {
          const payload = buildOrderPayload(
            draft,
            editingOrder.createdAt,
            editingOrder.calculation.customExpenses ?? [],
          );
          await updateSalesOrder(editingOrder.id, payload);
          onOrdersChange(
            orders.map((order) =>
              order.id === editingOrder.id
                ? { id: editingOrder.id, ...payload }
                : order,
            ),
          );
          setEditingOrder(null);
          window.alert("Order updated successfully.");
          return;
        }

        const payload = buildOrderPayload(draft, Date.now());
        const id = await createSalesOrder(payload);
        onOrdersChange([{ id, ...payload }, ...orders]);
        window.alert("Order saved successfully.");
      } catch (error) {
        console.error("Failed to save order", error);
        window.alert(
          editingOrder
            ? "Failed to update order. Please try again."
            : "Failed to save order. Please try again.",
        );
      } finally {
        setSaving(false);
      }
    },
    [buildOrderPayload, editingOrder, orders, onOrdersChange],
  );

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this order?")) return;
    setDeletingId(id);
    try {
      await deleteSalesOrder(id);
      onOrdersChange(orders.filter((order) => order.id !== id));
      if (editingOrder?.id === id) {
        setEditingOrder(null);
      }
    } catch (error) {
      console.error("Failed to delete order", error);
      window.alert("Failed to delete order. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div ref={formRef}>
        <OrderForm
          settings={settings}
          editOrder={editingOrder}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          saving={saving}
        />
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-5">
        <h2 className="text-[19px] font-semibold mb-4">All Orders</h2>
        <OrdersTable
          orders={sortedOrders}
          onEdit={handleEdit}
          onDelete={handleDelete}
          editingId={editingOrder?.id ?? null}
          deletingId={deletingId}
        />
      </div>
    </div>
  );
};

export default OrdersTab;
