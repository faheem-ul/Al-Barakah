import { google, sheets_v4 } from "googleapis";
import { ORDER_SHEET_HEADERS } from "@/lib/shopify/orders-to-sheet-rows";

const LOG = "[Google Sheets]";

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const privateKey = privateKeyRaw
    ? normalizePrivateKey(privateKeyRaw)
    : undefined;

  if (!clientEmail || !privateKey) {
    console.error(
      `${LOG} Missing credentials — email:`,
      Boolean(clientEmail),
      "private_key:",
      Boolean(privateKey)
    );
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
    );
  }

  console.log(`${LOG} Auth as:`, clientEmail);
  console.log(
    `${LOG} Private key looks valid:`,
    privateKey.includes("BEGIN PRIVATE KEY")
  );

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const preferredTab =
    process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";

  if (!spreadsheetId) {
    console.error(`${LOG} Missing GOOGLE_SHEETS_SPREADSHEET_ID`);
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  console.log(`${LOG} Spreadsheet ID:`, spreadsheetId);
  console.log(`${LOG} Preferred tab name:`, preferredTab);

  return { spreadsheetId, preferredTab };
}

/** A1 ranges require quotes when the tab name has spaces or special chars. */
function sheetRange(tabName: string, a1: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${a1}`;
}

/**
 * Document title (top of browser) is NOT the tab name (bottom tabs).
 * Resolve against actual sheet tabs in the spreadsheet.
 */
async function resolveTabName(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  preferredTab: string
): Promise<string> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties(sheetId,title,index)",
  });

  const docTitle = meta.data.properties?.title;
  const tabs =
    meta.data.sheets
      ?.map((s) => s.properties)
      .filter(Boolean)
      .map((p) => ({
        title: p!.title || "",
        sheetId: p!.sheetId,
        index: p!.index,
      })) ?? [];

  console.log(`${LOG} Document title:`, docTitle);
  console.log(
    `${LOG} Available tabs:`,
    tabs.map((t) => `"${t.title}" (gid=${t.sheetId})`).join(", ") || "(none)"
  );

  const exact = tabs.find((t) => t.title === preferredTab);
  if (exact) {
    console.log(`${LOG} Using tab (exact match):`, exact.title);
    return exact.title;
  }

  const caseInsensitive = tabs.find(
    (t) => t.title.toLowerCase() === preferredTab.toLowerCase()
  );
  if (caseInsensitive) {
    console.log(
      `${LOG} Using tab (case-insensitive match):`,
      caseInsensitive.title
    );
    return caseInsensitive.title;
  }

  // Preferred name is often the *document* title — fall back to first tab
  const first = tabs[0]?.title;
  if (first) {
    console.warn(
      `${LOG} Tab "${preferredTab}" not found. Falling back to first tab: "${first}"`
    );
    return first;
  }

  throw new Error(
    `No sheets found in spreadsheet ${spreadsheetId}. Available tabs: (none)`
  );
}

async function ensureHeaderRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
) {
  const range = sheetRange(tabName, "A1:AZ1");
  console.log(`${LOG} Checking header row at`, range);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const firstRow = existing.data.values?.[0] ?? [];
  const headers = ORDER_SHEET_HEADERS as unknown as string[];

  if (!firstRow.length) {
    console.log(`${LOG} No header found — writing header row`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tabName, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    console.log(`${LOG} Header row written (${headers.length} columns)`);
    return;
  }

  const isNewLayout =
    firstRow[0] === "Order Number" &&
    firstRow.includes("Name of User") &&
    firstRow.includes("Product Name") &&
    firstRow.includes("Financial Status");

  if (!isNewLayout) {
    console.warn(
      `${LOG} Old/unknown header layout detected (${firstRow[0]}). Replacing row 1 with slim headers. Move old data rows to an Archive tab if you still need them.`
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tabName, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    console.log(`${LOG} Header row replaced (${headers.length} columns)`);
    return;
  }

  if (!firstRow.includes("Tracking Number")) {
    const startCol = firstRow.length + 1;
    const trackingHeaders = [
      "Tracking Number",
      "Tracking URL",
      "Tracking Status",
      "Tracking Location",
      "Tracking Detail",
      "Tracking Checked At",
    ];
    const colLetter = columnToLetter(startCol);
    console.log(
      `${LOG} Appending tracking headers at column ${colLetter}`
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tabName, `${colLetter}1`),
      valueInputOption: "RAW",
      requestBody: { values: [trackingHeaders] },
    });
    return;
  }

  console.log(
    `${LOG} Header already present (${firstRow.length} columns) — skip write`
  );
}

function columnToLetter(column: number): string {
  let temp = column;
  let letter = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

/**
 * Find next empty row by scanning column A (Order Number).
 */
async function getNextRowInColumnA(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<number> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "A:A"),
    majorDimension: "ROWS",
  });

  const values = result.data.values ?? [];
  let lastFilled = 0;
  for (let i = 0; i < values.length; i++) {
    const cell = values[i]?.[0];
    if (cell !== undefined && String(cell).trim() !== "") {
      lastFilled = i + 1;
    }
  }

  const nextRow = lastFilled + 1;
  console.log(
    `${LOG} Column A last filled row: ${lastFilled}, next write row: ${nextRow}`
  );
  return Math.max(nextRow, 2);
}

/** Column A = Order Number (dedupe key for new slim sheet layout). */
async function orderNumberAlreadyExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  orderNumber: string
): Promise<boolean> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "A:A"),
    majorDimension: "ROWS",
  });

  const values = result.data.values ?? [];
  const exists = values.some(
    (row) => String(row?.[0] ?? "").trim() === orderNumber
  );
  console.log(`${LOG} Order Number ${orderNumber} already in sheet:`, exists);
  return exists;
}

/** Prevent concurrent webhook retries for the same order in this process. */
const inFlightOrderIds = new Set<string>();

export type AppendOrderResult = {
  written: boolean;
  skipped: boolean;
  reason?: string;
  rows?: number;
};

/**
 * Appends order rows starting at column A on the next empty row.
 * Skips if this order number was already written (idempotent).
 */
export async function appendOrderRows(
  rows: string[][],
  orderNumber: string | number
): Promise<AppendOrderResult> {
  if (!rows.length) {
    console.log(`${LOG} No rows to append — skipping`);
    return { written: false, skipped: true, reason: "no_rows" };
  }

  const orderKey = String(orderNumber).trim();
  if (!orderKey) {
    throw new Error("orderNumber is required for idempotent sheet writes");
  }

  if (inFlightOrderIds.has(orderKey)) {
    console.log(
      `${LOG} Order ${orderKey} already being written — skipping duplicate`
    );
    return {
      written: false,
      skipped: true,
      reason: "in_flight",
    };
  }

  inFlightOrderIds.add(orderKey);
  console.log(`${LOG} appendOrderRows called with`, rows.length, "row(s)");

  try {
    const sheets = getSheetsClient();
    const { spreadsheetId, preferredTab } = getSpreadsheetConfig();
    const tabName = await resolveTabName(sheets, spreadsheetId, preferredTab);

    await ensureHeaderRow(sheets, spreadsheetId, tabName);

    if (
      await orderNumberAlreadyExists(sheets, spreadsheetId, tabName, orderKey)
    ) {
      console.log(
        `${LOG} Skipping duplicate — order ${orderKey} already in sheet`
      );
      return {
        written: false,
        skipped: true,
        reason: "already_exists",
      };
    }

    const startRow = await getNextRowInColumnA(sheets, spreadsheetId, tabName);
    const writeRange = sheetRange(tabName, `A${startRow}`);
    console.log(`${LOG} Writing ${rows.length} row(s) at`, writeRange);

    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: writeRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    console.log(`${LOG} Write result:`, {
      updatedRange: result.data.updatedRange,
      updatedRows: result.data.updatedRows,
      updatedCells: result.data.updatedCells,
    });

    return {
      written: true,
      skipped: false,
      rows: rows.length,
    };
  } finally {
    inFlightOrderIds.delete(orderKey);
  }
}

export type UpdateOrderStatusResult = {
  updated: boolean;
  rowsUpdated: number;
  reason?: string;
};

/**
 * Updates Financial Status on every sheet row matching the order number.
 */
export async function updateOrderStatuses(
  orderNumber: string | number,
  financialStatus: string
): Promise<UpdateOrderStatusResult> {
  const orderKey = String(orderNumber).trim();
  if (!orderKey) {
    return { updated: false, rowsUpdated: 0, reason: "missing_order_number" };
  }

  const sheets = getSheetsClient();
  const { spreadsheetId, preferredTab } = getSpreadsheetConfig();
  const tabName = await resolveTabName(sheets, spreadsheetId, preferredTab);

  await ensureHeaderRow(sheets, spreadsheetId, tabName);

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "A1:AZ1"),
  });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) =>
    String(h || "").trim()
  );
  const financialCol = headers.indexOf("Financial Status") + 1;

  if (!financialCol) {
    console.error(`${LOG} Financial Status column missing in header row`);
    return { updated: false, rowsUpdated: 0, reason: "missing_status_columns" };
  }

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "A:A"),
    majorDimension: "ROWS",
  });
  const values = colA.data.values ?? [];
  const rowIndexes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i]?.[0] ?? "").trim() === orderKey) {
      rowIndexes.push(i + 1);
    }
  }

  if (!rowIndexes.length) {
    console.log(`${LOG} No rows found for order ${orderKey} to update status`);
    return { updated: false, rowsUpdated: 0, reason: "not_found" };
  }

  const financialLetter = columnToLetter(financialCol);
  const data = rowIndexes.map((row) => ({
    range: sheetRange(tabName, `${financialLetter}${row}`),
    values: [[financialStatus]],
  }));

  console.log(
    `${LOG} Updating Financial Status for order ${orderKey} on ${rowIndexes.length} row(s):`,
    financialStatus
  );

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { updated: true, rowsUpdated: rowIndexes.length };
}
