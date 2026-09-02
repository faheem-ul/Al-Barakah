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

import type { StockPurchase, StockPurchasePayload } from "./types";

function mapPurchase(
  id: string,
  data: Partial<StockPurchasePayload>,
): StockPurchase {
  const qty = Number(data.qty) || 0;
  const unitPrice = Number(data.unitPrice) || 0;

  return {
    id,
    date: data.date ?? "",
    product: data.product ?? "",
    variant: data.variant ?? "",
    key: data.key ?? "",
    qty,
    unitPrice,
    totalCost: Number(data.totalCost) || qty * unitPrice,
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
  });
  return docRef.id;
}

export async function deleteStockPurchase(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-purchases", id));
}
