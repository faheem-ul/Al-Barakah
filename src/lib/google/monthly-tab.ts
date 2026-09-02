/**
 * Shared rule with Apps Script Code.gs:
 * tab name = full English month + year in Asia/Karachi, e.g. "September 2026"
 */

export const ORDERS_TZ = "Asia/Karachi";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Parts for a calendar date in Asia/Karachi. */
export function karachiYmd(date: Date = new Date()): {
  year: number;
  monthIndex: number; // 0–11
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORDERS_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

export function monthTabName(year: number, monthIndex: number): string {
  const name = MONTH_NAMES[monthIndex];
  if (!name || !Number.isFinite(year)) {
    throw new Error(`Invalid month tab parts: ${year}-${monthIndex}`);
  }
  return `${name} ${year}`;
}

/** Current month tab, e.g. "September 2026". */
export function currentMonthTabName(date: Date = new Date()): string {
  const { year, monthIndex } = karachiYmd(date);
  return monthTabName(year, monthIndex);
}

/** Previous calendar month tab (for in-transit refresh across month boundary). */
export function previousMonthTabName(date: Date = new Date()): string {
  const { year, monthIndex } = karachiYmd(date);
  if (monthIndex === 0) return monthTabName(year - 1, 11);
  return monthTabName(year, monthIndex - 1);
}

const MONTHLY_TAB_RE =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;

export function isMonthlyOrdersTabName(title: string): boolean {
  return MONTHLY_TAB_RE.test(String(title || "").trim());
}
