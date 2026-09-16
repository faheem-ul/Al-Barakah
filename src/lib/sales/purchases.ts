import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "@/lib/firebase";

import type { StockPurchase, StockPurchasePayload } from "./types";

function mapPurchase(
  id: string,
  data: Partial<StockPurchasePayload>,
): StockPurchase {
  const qty = Number(data.qty) || 0;
  const unitPrice = Number(data.unitPrice) || 0;

  const wholesalerId =
    typeof data.wholesalerId === "string" && data.wholesalerId.trim()
      ? data.wholesalerId.trim()
      : undefined;

  return {
    id,
    date: data.date ?? "",
    product: data.product ?? "",
    variant: data.variant ?? "",
    key: data.key ?? "",
    qty,
    unitPrice,
    totalCost: Number(data.totalCost) || qty * unitPrice,
    wholesalerId,
    createdAt: data.createdAt ?? Date.now(),
  };
}

export async function getAllStockPurchases(): Promise<StockPurchase[]> {
  const base = collection(db, "sales-purchases");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapPurchase(d.id, d.data() as Partial<StockPurchasePayload>),
  );
}

export async function createStockPurchase(
  payload: StockPurchasePayload,
): Promise<string> {
  const docRef = await addDoc(collection(db, "sales-purchases"), {
    ...payload,
    totalCost: payload.qty * payload.unitPrice,
    ...(payload.wholesalerId ? { wholesalerId: payload.wholesalerId } : {}),
  });
  return docRef.id;
}

export async function deleteStockPurchase(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-purchases", id));
}

export async function updateStockPurchase(
  id: string,
  payload: StockPurchasePayload,
): Promise<void> {
  await updateDoc(doc(db, "sales-purchases", id), {
    date: payload.date,
    product: payload.product,
    variant: payload.variant,
    key: payload.key,
    qty: payload.qty,
    unitPrice: payload.unitPrice,
    totalCost: payload.qty * payload.unitPrice,
    createdAt: payload.createdAt,
    wholesalerId: payload.wholesalerId,
  });
}
