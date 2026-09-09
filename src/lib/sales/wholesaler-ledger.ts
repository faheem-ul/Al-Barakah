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
  WholesalerLedgerEntry,
  WholesalerLedgerPayload,
  WholesalerLedgerType,
} from "./types";

function mapWholesalerEntry(
  id: string,
  data: Partial<WholesalerLedgerPayload>,
): WholesalerLedgerEntry {
  const type: WholesalerLedgerType =
    data.type === "payment" ? "payment" : "credit";

  return {
    id,
    type,
    date: data.date ?? "",
    amount: Number(data.amount) || 0,
    note: data.note?.trim() ?? "",
    createdAt: data.createdAt ?? Date.now(),
  };
}

export async function getAllWholesalerLedger(): Promise<WholesalerLedgerEntry[]> {
  const base = collection(db, "sales-wholesaler-ledger");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapWholesalerEntry(d.id, d.data() as Partial<WholesalerLedgerPayload>),
  );
}

export async function createWholesalerEntry(
  payload: WholesalerLedgerPayload,
): Promise<string> {
  const docRef = await addDoc(collection(db, "sales-wholesaler-ledger"), {
    ...payload,
    type: payload.type === "payment" ? "payment" : "credit",
    amount: Number(payload.amount) || 0,
    note: payload.note.trim(),
  });
  return docRef.id;
}

export async function deleteWholesalerEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-wholesaler-ledger", id));
}
