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

import type { StockExpense, StockExpensePayload } from "./types";

function mapExpense(
  id: string,
  data: Partial<StockExpensePayload>,
): StockExpense {
  return {
    id,
    name: data.name?.trim() ?? "",
    amount: Number(data.amount) || 0,
    date: data.date ?? "",
    createdAt: data.createdAt ?? Date.now(),
  };
}

export async function getAllStockExpenses(): Promise<StockExpense[]> {
  const base = collection(db, "sales-expenses");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapExpense(d.id, d.data() as Partial<StockExpensePayload>),
  );
}

export async function createStockExpense(
  payload: StockExpensePayload,
): Promise<string> {
  const docRef = await addDoc(collection(db, "sales-expenses"), {
    ...payload,
    name: payload.name.trim(),
    amount: Number(payload.amount) || 0,
  });
  return docRef.id;
}

export async function deleteStockExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-expenses", id));
}
