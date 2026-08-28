import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "@/lib/firebase";

import type {
  SalesOrder,
  SalesOrderCalculation,
  SalesOrderPayload,
} from "./types";

function mapCalculation(
  calculation?: Partial<SalesOrderCalculation> & { netOutcome?: number },
): SalesOrderCalculation {
  const base = calculation ?? {};
  return {
    productRevenue: base.productRevenue ?? 0,
    shipping: base.shipping ?? 0,
    weight: base.weight ?? 0,
    units: base.units ?? 0,
    honeyCost: base.honeyCost ?? 0,
    packing: base.packing ?? 0,
    courier: base.courier ?? 0,
    revenue: base.revenue ?? 0,
    expenses: base.expenses ?? 0,
    netProfit: base.netProfit ?? base.netOutcome ?? 0,
  };
}

function mapOrder(id: string, data: Partial<SalesOrderPayload>): SalesOrder {
  return {
    id,
    orderNumber: data.orderNumber ?? "",
    date: data.date ?? "",
    status: data.status ?? "pending",
    courierService: data.courierService ?? "overnight",
    zone: data.zone ?? "withinCity",
    products: data.products ?? [],
    calculation: mapCalculation(data.calculation),
    createdAt: data.createdAt ?? Date.now(),
  };
}

export async function getAllSalesOrders(): Promise<SalesOrder[]> {
  const base = collection(db, "sales-orders");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapOrder(d.id, d.data() as Partial<SalesOrderPayload>),
  );
}

export async function createSalesOrder(
  payload: SalesOrderPayload,
): Promise<string> {
  const docRef = await addDoc(collection(db, "sales-orders"), payload);
  return docRef.id;
}

export async function deleteSalesOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-orders", id));
}
