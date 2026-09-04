import { db, doc, getDoc, setDoc } from "@/lib/firebase";

import { DEFAULT_SALES_SETTINGS } from "./defaults";
import type { CustomExpense, NumericSettingsKey, SalesSettings } from "./types";

const SETTINGS_DOC_PATH = ["sales-settings", "default"] as const;
const MAX_CUSTOM_EXPENSES = 20;

const NUMERIC_KEYS: NumericSettingsKey[] = [
  "p_m500",
  "c_m500",
  "p_m1000",
  "c_m1000",
  "p_f500",
  "c_f500",
  "p_f1000",
  "c_f1000",
  "p_s500",
  "c_s500",
  "p_s1000",
  "c_s1000",
  "freeThreshold",
  "ship1",
  "ship3",
  "ship4",
  "packing",
  "courierSecondDay",
  "courierSecondDayAdditional",
  "fac",
];

function normalizeCustomExpenses(raw: unknown): CustomExpense[] {
  if (!Array.isArray(raw)) return [];

  const expenses: CustomExpense[] = [];

  for (const item of raw.slice(0, MAX_CUSTOM_EXPENSES)) {
    if (!item || typeof item !== "object") continue;

    const record = item as Partial<CustomExpense>;
    const name = String(record.name ?? "").trim();
    if (!name) continue;

    expenses.push({
      id:
        typeof record.id === "string" && record.id
          ? record.id
          : crypto.randomUUID(),
      name: name.slice(0, 40),
      amount: Math.max(0, Number(record.amount) || 0),
      enabled: record.enabled !== false,
    });
  }

  return expenses;
}

function normalizeSettings(data: Partial<SalesSettings>): SalesSettings {
  const normalized = { ...DEFAULT_SALES_SETTINGS };

  for (const key of NUMERIC_KEYS) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      normalized[key] = Number(value) || 0;
    }
  }

  if (typeof data.updatedAt === "number") {
    normalized.updatedAt = data.updatedAt;
  }

  normalized.customExpenses = normalizeCustomExpenses(data.customExpenses);

  return normalized;
}

export async function getSalesSettings(): Promise<SalesSettings> {
  const ref = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { ...DEFAULT_SALES_SETTINGS };
  }

  return normalizeSettings(snap.data() as Partial<SalesSettings>);
}

export async function saveSalesSettings(
  settings: SalesSettings,
): Promise<void> {
  const ref = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const payload = normalizeSettings({
    ...settings,
    updatedAt: Date.now(),
  });
  await setDoc(ref, payload, { merge: true });
}
