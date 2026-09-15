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

import { markWholesalerLegacyMigrated, getSalesSettings } from "./settings";
import { getAllWholesalerLedger } from "./wholesaler-ledger";
import type {
  WholesalerAccount,
  WholesalerAccountPayload,
  WholesalerLedgerType,
  WholesalerTransaction,
  WholesalerTransactionPayload,
} from "./types";

export const LEGACY_WHOLESALER_DEFAULT_NAME = "Unnamed";

function mapWholesalerAccount(
  id: string,
  data: Partial<WholesalerAccountPayload>,
): WholesalerAccount {
  return {
    id,
    name: data.name?.trim() ?? "",
    createdAt: data.createdAt ?? Date.now(),
    isLegacySeed: data.isLegacySeed === true,
  };
}

function mapWholesalerTransaction(
  id: string,
  data: Partial<WholesalerTransactionPayload>,
): WholesalerTransaction {
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

function sortWholesalerAccounts(accounts: WholesalerAccount[]): WholesalerAccount[] {
  return [...accounts].sort((a, b) => {
    if (a.isLegacySeed && !b.isLegacySeed) return -1;
    if (!a.isLegacySeed && b.isLegacySeed) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export async function getAllWholesalers(): Promise<WholesalerAccount[]> {
  const snap = await getDocs(collection(db, "sales-wholesalers"));
  return sortWholesalerAccounts(
    snap.docs.map((d) =>
      mapWholesalerAccount(d.id, d.data() as Partial<WholesalerAccountPayload>),
    ),
  );
}

export async function createWholesaler(
  payload: WholesalerAccountPayload,
): Promise<WholesalerAccount> {
  const docRef = await addDoc(collection(db, "sales-wholesalers"), {
    name: payload.name.trim(),
    createdAt: payload.createdAt ?? Date.now(),
    ...(payload.isLegacySeed ? { isLegacySeed: true } : {}),
  });

  return mapWholesalerAccount(docRef.id, {
    ...payload,
    createdAt: payload.createdAt ?? Date.now(),
  });
}

export async function updateWholesaler(
  id: string,
  updates: { name: string },
): Promise<void> {
  const name = updates.name.trim();
  if (!name) {
    throw new Error("Wholesaler name is required.");
  }

  await updateDoc(doc(db, "sales-wholesalers", id), { name });
}

export async function getWholesalerTransactions(
  wholesalerId: string,
): Promise<WholesalerTransaction[]> {
  const base = collection(db, "sales-wholesalers", wholesalerId, "transactions");
  const q = query(base, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapWholesalerTransaction(d.id, d.data() as Partial<WholesalerTransactionPayload>),
  );
}

export async function getAllWholesalerTransactionsMap(
  wholesalers: WholesalerAccount[],
): Promise<Record<string, WholesalerTransaction[]>> {
  const entries = await Promise.all(
    wholesalers.map(async (wholesaler) => {
      const transactions = await getWholesalerTransactions(wholesaler.id);
      return [wholesaler.id, transactions] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function createWholesalerTransaction(
  wholesalerId: string,
  payload: WholesalerTransactionPayload,
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "sales-wholesalers", wholesalerId, "transactions"),
    {
      type: payload.type === "payment" ? "payment" : "credit",
      date: payload.date,
      amount: Number(payload.amount) || 0,
      note: payload.note.trim(),
      createdAt: payload.createdAt ?? Date.now(),
    },
  );
  return docRef.id;
}

export async function deleteWholesalerTransaction(
  wholesalerId: string,
  transactionId: string,
): Promise<void> {
  await deleteDoc(
    doc(db, "sales-wholesalers", wholesalerId, "transactions", transactionId),
  );
}

export async function deleteWholesaler(wholesalerId: string): Promise<void> {
  const transactions = await getWholesalerTransactions(wholesalerId);

  for (const transaction of transactions) {
    await deleteWholesalerTransaction(wholesalerId, transaction.id);
  }

  await deleteDoc(doc(db, "sales-wholesalers", wholesalerId));
}

export async function migrateLegacyWholesalerLedger(): Promise<void> {
  const settings = await getSalesSettings();
  if (settings.wholesalerLegacyMigrated) return;

  const legacyEntries = await getAllWholesalerLedger();
  const wholesalers = await getAllWholesalers();
  let legacyAccount = wholesalers.find((account) => account.isLegacySeed);

  if (!legacyAccount && legacyEntries.length > 0) {
    legacyAccount = await createWholesaler({
      name: LEGACY_WHOLESALER_DEFAULT_NAME,
      isLegacySeed: true,
      createdAt: Date.now(),
    });
  }

  if (legacyAccount && legacyEntries.length > 0) {
    const existingTransactions = await getWholesalerTransactions(legacyAccount.id);
    if (existingTransactions.length === 0) {
      for (const entry of legacyEntries) {
        await createWholesalerTransaction(legacyAccount.id, {
          type: entry.type,
          date: entry.date,
          amount: entry.amount,
          note: entry.note,
          createdAt: entry.createdAt,
        });
      }
    }
  }

  await markWholesalerLegacyMigrated();
}
