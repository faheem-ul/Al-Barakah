import { google, sheets_v4 } from "googleapis";
import { ORDER_SHEET_HEADERS } from "@/lib/shopify/orders-to-sheet-rows";

const LOG = "[Google Sheets]";

/** Light beige / white zebra like the ops screenshot */
const BANDING_COLORS = {
  header: { red: 0.93, green: 0.93, blue: 0.93 },
  firstBand: { red: 1, green: 1, blue: 1 },
  secondBand: { red: 0.96, green: 0.95, blue: 0.93 },
};

const STATUS_COL_INDEX = ORDER_SHEET_HEADERS.indexOf("Order Status"); // 0-based

/** RGB fills for Order Status (matches Apps Script styling). */
function orderStatusFill(status: string): {
  bg: { red: number; green: number; blue: number } | null;
  bold: boolean;
} {
  const n = String(status || "")
    .trim()
    .toLowerCase();
  if (!n) return { bg: null, bold: false };

  // Green — delivered
  if (n === "delivered" || n === "deliverd") {
    return {
      bg: { red: 52 / 255, green: 168 / 255, blue: 83 / 255 },
      bold: true,
    };
  }

  // Red — return / errors / failed outcomes
  if (
    n.startsWith("error:") ||
    n === "return" ||
    n.startsWith("return") ||
    n.includes("unsuccessful") ||
    n.includes("fail")
  ) {
    return {
      bg: { red: 234 / 255, green: 67 / 255, blue: 53 / 255 },
      bold: true,
    };
  }

  // Yellow — Pending and all other in-progress statuses
  // (Pending, Booked, In-transit, Re-Attempt, Hold, Reattempt, etc.)
  return {
    bg: { red: 251 / 255, green: 188 / 255, blue: 4 / 255 },
    bold: true,
  };
}

async function paintOrderStatusCells(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  cells: Array<{ rowIndex0: number; status: string }>
) {
  if (!cells.length || STATUS_COL_INDEX < 0) return;

  const requests = cells.map(({ rowIndex0, status }) => {
    const { bg, bold } = orderStatusFill(status);
    return {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex0,
          endRowIndex: rowIndex0 + 1,
          startColumnIndex: STATUS_COL_INDEX,
          endColumnIndex: STATUS_COL_INDEX + 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: bg || { red: 1, green: 1, blue: 1 },
            textFormat: { bold },
            horizontalAlignment: "CENTER",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    };
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
  console.log(`${LOG} Painted Order Status colour on ${cells.length} cell(s)`);
}

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

type TabMeta = {
  title: string;
  sheetId: number;
};

/**
 * Document title (top of browser) is NOT the tab name (bottom tabs).
 */
async function resolveTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  preferredTab: string
): Promise<TabMeta> {
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
        sheetId: p!.sheetId as number,
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
    return { title: exact.title, sheetId: exact.sheetId };
  }

  const caseInsensitive = tabs.find(
    (t) => t.title.toLowerCase() === preferredTab.toLowerCase()
  );
  if (caseInsensitive) {
    console.log(
      `${LOG} Using tab (case-insensitive match):`,
      caseInsensitive.title
    );
    return {
      title: caseInsensitive.title,
      sheetId: caseInsensitive.sheetId,
    };
  }

  const first = tabs[0];
  if (first) {
    console.warn(
      `${LOG} Tab "${preferredTab}" not found. Falling back to first tab: "${first.title}"`
    );
    return { title: first.title, sheetId: first.sheetId };
  }

  throw new Error(
    `No sheets found in spreadsheet ${spreadsheetId}. Available tabs: (none)`
  );
}

function headersMatchOpsLayout(firstRow: string[]): boolean {
  return (
    firstRow[0] === "Order Number" &&
    firstRow.includes("Date") &&
    firstRow.includes("Product Detail") &&
    firstRow.includes("Bottle Size") &&
    firstRow.includes("Retail Price") &&
    firstRow.includes("COD") &&
    firstRow.includes("Total Amount") &&
    firstRow.includes("Order Status") &&
    firstRow.includes("Tracking Number")
  );
}

/**
 * Insert Email after Contact without shifting data into wrong labels.
 * Safe to call repeatedly — no-op when Email already exists.
 */
async function ensureEmailColumn(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: TabMeta,
  firstRow: string[]
): Promise<string[]> {
  if (firstRow.includes("Email")) return firstRow;

  const contactIdx = firstRow.indexOf("Contact");
  if (contactIdx < 0) {
    console.warn(`${LOG} Contact column missing — cannot insert Email`);
    return firstRow;
  }

  const insertAt = contactIdx + 1; // 0-based index after Contact
  console.log(
    `${LOG} Inserting Email column at index ${insertAt} (after Contact)`
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: tab.sheetId,
              dimension: "COLUMNS",
              startIndex: insertAt,
              endIndex: insertAt + 1,
            },
            inheritFromBefore: true,
          },
        },
      ],
    },
  });

  const colLetter = columnIndexToLetter_(insertAt); // 0-based → A=0
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(tab.title, `${colLetter}1`),
    valueInputOption: "RAW",
    requestBody: { values: [["Email"]] },
  });

  const next = [...firstRow];
  next.splice(insertAt, 0, "Email");
  return next;
}

/** 0-based column index → A1 letter(s). */
function columnIndexToLetter_(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function ensureHeaderRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: TabMeta
) {
  const range = sheetRange(tab.title, "A1:AZ1");
  console.log(`${LOG} Checking header row at`, range);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  let firstRow = (existing.data.values?.[0] ?? []).map((h) =>
    String(h || "").trim()
  );
  const headers = ORDER_SHEET_HEADERS as unknown as string[];

  if (!firstRow.length || !headersMatchOpsLayout(firstRow)) {
    console.warn(
      `${LOG} Header missing or old layout (A1="${firstRow[0] || ""}"). Writing ops headers.`
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tab.title, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    await applySheetPresentation_(sheets, spreadsheetId, tab.sheetId);
    console.log(`${LOG} Header row written (${headers.length} columns)`);
    return;
  }

  firstRow = await ensureEmailColumn(sheets, spreadsheetId, tab, firstRow);

  console.log(
    `${LOG} Header already present (${firstRow.length} columns) — skip full rewrite`
  );
}

/** Freeze header, bold it, apply zebra banding once (ignore if banding already exists). */
async function applySheetPresentation_(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
) {
  const colCount = ORDER_SHEET_HEADERS.length;

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: colCount,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: BANDING_COLORS.header,
                  horizontalAlignment: "CENTER",
                },
              },
              fields:
                "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.warn(`${LOG} Header freeze/style failed:`, error);
  }

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addBanding: {
              bandedRange: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endColumnIndex: colCount,
                },
                rowProperties: {
                  headerColor: BANDING_COLORS.header,
                  firstBandColor: BANDING_COLORS.firstBand,
                  secondBandColor: BANDING_COLORS.secondBand,
                },
              },
            },
          },
        ],
      },
    });
    console.log(`${LOG} Applied freeze + header style + zebra banding`);
  } catch (error) {
    console.warn(
      `${LOG} Zebra banding skipped (often already present):`,
      error instanceof Error ? error.message : error
    );
  }
}

/** Column A = Order Number */
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
 * Inserts order rows at the top of the sheet (directly under the header).
 * Newest Shopify orders appear first.
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
    const tab = await resolveTab(sheets, spreadsheetId, preferredTab);

    await ensureHeaderRow(sheets, spreadsheetId, tab);

    if (
      await orderNumberAlreadyExists(sheets, spreadsheetId, tab.title, orderKey)
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

    const insertCount = rows.length;
    console.log(
      `${LOG} Inserting ${insertCount} row(s) at top (after header) for order ${orderKey}`
    );

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: tab.sheetId,
                dimension: "ROWS",
                startIndex: 1,
                endIndex: 1 + insertCount,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });

    const writeRange = sheetRange(tab.title, `A2`);
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

    // Colour Order Status for newly inserted rows (Pending → red, etc.)
    await paintOrderStatusCells(
      sheets,
      spreadsheetId,
      tab.sheetId,
      rows.map((row, i) => ({
        rowIndex0: 1 + i, // row 2 onwards
        status: String(row[STATUS_COL_INDEX] ?? ""),
      }))
    );

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
 * Updates Order Status on every sheet row matching the order number.
 */
export async function updateOrderStatuses(
  orderNumber: string | number,
  orderStatus: string
): Promise<UpdateOrderStatusResult> {
  const orderKey = String(orderNumber).trim();
  if (!orderKey) {
    return { updated: false, rowsUpdated: 0, reason: "missing_order_number" };
  }

  const sheets = getSheetsClient();
  const { spreadsheetId, preferredTab } = getSpreadsheetConfig();
  const tab = await resolveTab(sheets, spreadsheetId, preferredTab);

  await ensureHeaderRow(sheets, spreadsheetId, tab);

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tab.title, "A1:AZ1"),
  });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) =>
    String(h || "").trim()
  );
  const statusCol = headers.indexOf("Order Status") + 1;

  if (!statusCol) {
    console.error(`${LOG} Order Status column missing in header row`);
    return { updated: false, rowsUpdated: 0, reason: "missing_status_columns" };
  }

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tab.title, "A:A"),
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

  // Don't overwrite M&P-driven statuses (Delivered / in-transit) with generic Pending
  const statusLetter = columnToLetter(statusCol);
  const existingStatusRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: rowIndexes.map(
      (row) => sheetRange(tab.title, `${statusLetter}${row}`)
    ),
  });

  const protectedStatuses = new Set([
    "delivered",
    "deliverd",
    "in transit",
    "out for delivery",
    "re-attempt advice",
  ]);

  const data: { range: string; values: string[][] }[] = [];
  for (let i = 0; i < rowIndexes.length; i++) {
    const current = String(
      existingStatusRes.data.valueRanges?.[i]?.values?.[0]?.[0] ?? ""
    )
      .trim()
      .toLowerCase();
    if (protectedStatuses.has(current) || current.startsWith("error:")) {
      console.log(
        `${LOG} Skipping Order Status overwrite on row ${rowIndexes[i]} (current: ${current})`
      );
      continue;
    }
    data.push({
      range: sheetRange(tab.title, `${statusLetter}${rowIndexes[i]}`),
      values: [[orderStatus]],
    });
  }

  if (!data.length) {
    return { updated: true, rowsUpdated: 0, reason: "protected_status" };
  }

  console.log(
    `${LOG} Updating Order Status for order ${orderKey} on ${data.length} row(s):`,
    orderStatus
  );

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  await paintOrderStatusCells(
    sheets,
    spreadsheetId,
    tab.sheetId,
    data.map((item) => {
      // ranges like 'Sheet1'!M12 → row 12
      const match = item.range.match(/![A-Z]+(\d+)$/i);
      const row1Based = match ? Number(match[1]) : 0;
      return {
        rowIndex0: Math.max(row1Based - 1, 0),
        status: orderStatus,
      };
    })
  );

  return { updated: true, rowsUpdated: data.length };
}
