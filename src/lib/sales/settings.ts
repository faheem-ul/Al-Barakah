import { db, doc, getDoc, setDoc } from "@/lib/firebase";

import { DEFAULT_SALES_SETTINGS } from "./defaults";
import type { SalesSettings } from "./types";

const SETTINGS_DOC_PATH = ["sales-settings", "default"] as const;

const NUMERIC_KEYS: (keyof SalesSettings)[] = [
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
