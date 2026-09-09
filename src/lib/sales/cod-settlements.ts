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

import type { CodSettlement, CodSettlementPayload } from "./types";

function mapCodSettlement(
  id: string,
  data: Partial<CodSettlementPayload>,
): CodSettlement {
  return {
    id,
    date: data.date ?? "",
    amount: Number(data.amount) || 0,
    reference: data.reference?.trim() ?? "",
    note: data.note?.trim() ?? "",
    createdAt: data.createdAt ?? Date.now(),
  };
}

export async function getAllCodSettlements(): Promise<CodSettlement[]> {
  const base = collection(db, "sales-cod-settlements");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapCodSettlement(d.id, d.data() as Partial<CodSettlementPayload>),
  );
}

export async function createCodSettlement(
  payload: CodSettlementPayload,
): Promise<string> {
  const docRef = await addDoc(collection(db, "sales-cod-settlements"), {
    ...payload,
    amount: Number(payload.amount) || 0,
    reference: payload.reference.trim(),
    note: payload.note.trim(),
  });
  return docRef.id;
}

export async function deleteCodSettlement(id: string): Promise<void> {
  await deleteDoc(doc(db, "sales-cod-settlements", id));
}
