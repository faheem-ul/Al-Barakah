"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import {
  calculateSavedProducts,
  recomputeCalculationFromSnapshot,
} from "@/lib/sales/calculations";
import {
  createSalesOrder,
  deleteSalesOrder,
  updateSalesOrder,
} from "@/lib/sales/orders";
import { getProductById } from "@/lib/sales/products";
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

type OrderDraftInput = {
  orderNumber: string;
  buyerName: string;
  consignmentNumber: string;
  date: string;
  status: OrderStatus;
  courierService: CourierService;
  zone: CourierZone;
  lines: { key: string; qty: number }[];
  customerShipping: number;
  actualCourier: number;
  courierTouched: boolean;
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  settings,
  orders,
  onOrdersChange,
}) => {
  const { user } = useAdminAuth();
  const formRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingComplaintId, setSendingComplaintId] = useState<string | null>(
    null,
  );
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [orders],
  );

  const buildCreatePayload = useCallback(
    (draft: OrderDraftInput, createdAt: number) => {
      const productsData = draft.lines
        .map((line) => {
          const product = getProductById(settings.catalogProducts, line.key);
          if (!product) return null;
          return {
            product: product.product,
            variant: product.variant,
            key: product.id,
            qty: line.qty,
          };
        })
        .filter(Boolean) as SalesOrder["products"];

      const calculation = calculateSavedProducts(
        settings,
        settings.catalogProducts,
        productsData,
        draft.status,
        draft.courierService,
        draft.zone,
        {
          customerShippingOverride: draft.customerShipping,
          courierOverride: draft.actualCourier,
        },
      );

      return {
        orderNumber: draft.orderNumber,
        buyerName: draft.buyerName,
        consignmentNumber: draft.consignmentNumber.trim(),
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

  const buildEditPayload = useCallback(
    (draft: OrderDraftInput, existing: SalesOrder) => {
      const calculation = recomputeCalculationFromSnapshot(existing.calculation, {
        status: draft.status,
        shipping: draft.customerShipping,
        courier: draft.actualCourier,
      });

      return {
        orderNumber: draft.orderNumber,
        buyerName: draft.buyerName,
        consignmentNumber: draft.consignmentNumber.trim(),
        date: draft.date,
        status: draft.status,
        courierService: existing.courierService,
        zone: existing.zone,
        products: existing.products,
        calculation,
        createdAt: existing.createdAt,
      };
    },
    [],
  );

  const handleSave = useCallback(
    async (draft: OrderDraftInput) => {
      setSaving(true);
      try {
        if (editingOrder) {
          const payload = buildEditPayload(draft, editingOrder);
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

        const payload = buildCreatePayload(draft, Date.now());
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
    [buildCreatePayload, buildEditPayload, editingOrder, orders, onOrdersChange],
  );

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
  };

  const handleSendMpComplaint = async (order: SalesOrder) => {
    if (!user) {
      window.alert("Please sign in to send complaint emails.");
      return;
    }

    if (
      !window.confirm(
        `Send M&P complaint email for order ${order.orderNumber}?`,
      )
    ) {
      return;
    }

    setSendingComplaintId(order.id);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sales/mp-complaint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        window.alert(data?.error || "Failed to send complaint email.");
        return;
      }

      window.alert("M&P complaint email sent successfully.");
    } catch (error) {
      console.error("Failed to send M&P complaint email", error);
      window.alert("Failed to send complaint email. Please try again.");
    } finally {
      setSendingComplaintId(null);
    }
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
          onSendMpComplaint={handleSendMpComplaint}
          editingId={editingOrder?.id ?? null}
          deletingId={deletingId}
          sendingComplaintId={sendingComplaintId}
        />
      </div>
    </div>
  );
};

export default OrdersTab;
