import { google, sheets_v4 } from "googleapis";
import {
  currentMonthTabName,
  isMonthlyOrdersTabName,
} from "@/lib/google/monthly-tab";
import {
  ORDER_LEVEL_MERGE_HEADERS,
  ORDER_SHEET_HEADERS,
} from "@/lib/shopify/orders-to-sheet-rows";

const LOG = "[Google Sheets]";

/** Archive tab for older / mixed-month orders — never renamed. */
const LEGACY_TAB_NAME = "Sheet1";

/** Light beige / white zebra like the ops screenshot */
const BANDING_COLORS = {
  header: { red: 0.93, green: 0.93, blue: 0.93 },
  firstBand: { red: 1, green: 1, blue: 1 },
  secondBand: { red: 0.96, green: 0.95, blue: 0.93 },
};

const STATUS_COL_INDEX = ORDER_SHEET_HEADERS.indexOf("Order Status"); // 0-based

const MERGE_COL_INDEXES = ORDER_LEVEL_MERGE_HEADERS.map((h) =>
  ORDER_SHEET_HEADERS.indexOf(h as (typeof ORDER_SHEET_HEADERS)[number])
).filter((i) => i >= 0);

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
  /**
   * Optional forced tab override (debug only).
   * Leave unset in production — tab is computed as "September 2026" etc.
   */
  const tabOverride = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "";

  if (!spreadsheetId) {
    console.error(`${LOG} Missing GOOGLE_SHEETS_SPREADSHEET_ID`);
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  console.log(`${LOG} Spreadsheet ID:`, spreadsheetId);
  if (tabOverride) {
    console.log(`${LOG} Tab override (GOOGLE_SHEETS_TAB_NAME):`, tabOverride);
  }

  return { spreadsheetId, tabOverride };
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

type ListedTab = TabMeta & { index?: number | null };

async function listTabs(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<{ docTitle?: string | null; tabs: ListedTab[] }> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties(sheetId,title,index)",
  });

  const tabs =
    meta.data.sheets
      ?.map((s) => s.properties)
      .filter(Boolean)
      .map((p) => ({
        title: p!.title || "",
        sheetId: p!.sheetId as number,
        index: p!.index,
      })) ?? [];

  return { docTitle: meta.data.properties?.title, tabs };
}

async function findTabByTitle(
  tabs: ListedTab[],
  title: string
): Promise<TabMeta | null> {
  const exact = tabs.find((t) => t.title === title);
  if (exact) return { title: exact.title, sheetId: exact.sheetId };
  const ci = tabs.find(
    (t) => t.title.toLowerCase() === title.toLowerCase()
  );
  if (ci) return { title: ci.title, sheetId: ci.sheetId };
  return null;
}

/** Sheet1 + every "September 2026"-style month tab. */
function ordersTabsFromList(tabs: ListedTab[]): TabMeta[] {
  return tabs
    .filter(
      (t) =>
        t.title === LEGACY_TAB_NAME || isMonthlyOrdersTabName(t.title)
    )
    .map((t) => ({ title: t.title, sheetId: t.sheetId }));
}

function normalizeOrderKey(value: string | number): string {
  return String(value ?? "")
    .trim()
    .replace(/^#/, "");
}

function orderKeysMatch(cell: string, orderKey: string): boolean {
  return normalizeOrderKey(cell) === normalizeOrderKey(orderKey);
}

async function createTabWithHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string
): Promise<TabMeta> {
  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
              index: 0,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    },
  });

  const sheetId =
    created.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
  if (sheetId == null) {
    throw new Error(`Failed to create sheet tab "${title}"`);
  }

  const tab: TabMeta = { title, sheetId };
  const headers = ORDER_SHEET_HEADERS as unknown as string[];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(title, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
  await applySheetPresentation_(sheets, spreadsheetId, sheetId);
  await ensureVerifyDropdown_(sheets, spreadsheetId, tab, headers);
  console.log(`${LOG} Created monthly tab "${title}" with ops headers + Verify dropdown`);
  return tab;
}

/**
 * Resolve the orders tab for writes:
 * 1) Optional GOOGLE_SHEETS_TAB_NAME override
 * 2) Current month tab ("September 2026") if it exists
 * 3) Otherwise create the monthly tab with headers
 *
 * Legacy Sheet1 is never renamed — it stays as the archive of older mixed months.
 *
 * Document title (browser) is NOT the tab name (bottom tabs).
 */
async function resolveOrCreateOrdersTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabOverride: string
): Promise<TabMeta> {
  const { docTitle, tabs } = await listTabs(sheets, spreadsheetId);
  console.log(`${LOG} Document title:`, docTitle);
  console.log(
    `${LOG} Available tabs:`,
    tabs.map((t) => `"${t.title}" (gid=${t.sheetId})`).join(", ") || "(none)"
  );

  if (tabOverride) {
    const forced = await findTabByTitle(tabs, tabOverride);
    if (forced) {
      console.log(`${LOG} Using override tab:`, forced.title);
      return forced;
    }
    console.warn(
      `${LOG} Override tab "${tabOverride}" missing — creating it`
    );
    return createTabWithHeaders(sheets, spreadsheetId, tabOverride);
  }

  const monthly = currentMonthTabName();
  console.log(`${LOG} Current month tab:`, monthly);

  const existing = await findTabByTitle(tabs, monthly);
  if (existing) {
    console.log(`${LOG} Using monthly tab:`, existing.title);
    return existing;
  }

  console.log(`${LOG} Monthly tab missing — creating "${monthly}"`);
  return createTabWithHeaders(sheets, spreadsheetId, monthly);
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

/**
 * Insert Verify after Order Status so existing rows stay aligned.
 * Admin types false / true / already done; Apps Script books M&P on true.
 */
async function ensureVerifyColumn(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: TabMeta,
  firstRow: string[]
): Promise<string[]> {
  if (firstRow.includes("Verify")) return firstRow;

  const statusIdx = firstRow.indexOf("Order Status");
  if (statusIdx < 0) {
    console.warn(`${LOG} Order Status column missing — cannot insert Verify`);
    return firstRow;
  }

  const insertAt = statusIdx + 1;
  console.log(
    `${LOG} Inserting Verify column at index ${insertAt} (after Order Status)`
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

  const colLetter = columnIndexToLetter_(insertAt);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(tab.title, `${colLetter}1`),
    valueInputOption: "RAW",
    requestBody: { values: [["Verify"]] },
  });

  const next = [...firstRow];
  next.splice(insertAt, 0, "Verify");
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
    await ensureVerifyDropdown_(sheets, spreadsheetId, tab, headers);
    console.log(`${LOG} Header row written (${headers.length} columns)`);
    return;
  }

  firstRow = await ensureEmailColumn(sheets, spreadsheetId, tab, firstRow);
  firstRow = await ensureVerifyColumn(sheets, spreadsheetId, tab, firstRow);
  await ensureVerifyDropdown_(sheets, spreadsheetId, tab, firstRow);

  console.log(
    `${LOG} Header already present (${firstRow.length} columns) — skip full rewrite`
  );
}

const VERIFY_DROPDOWN_VALUES = ["false", "true", "already done"] as const;

/** List dropdown on Verify column (same as Apps Script). */
async function ensureVerifyDropdown_(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: TabMeta,
  headerRow: string[]
) {
  const verifyIdx = headerRow.indexOf("Verify");
  if (verifyIdx < 0) {
    console.warn(`${LOG} Verify column missing — skip dropdown`);
    return;
  }

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId: tab.sheetId,
                startRowIndex: 1, // row 2
                endRowIndex: 2000,
                startColumnIndex: verifyIdx,
                endColumnIndex: verifyIdx + 1,
              },
              rule: {
                condition: {
                  type: "ONE_OF_LIST",
                  values: VERIFY_DROPDOWN_VALUES.map((v) => ({
                    userEnteredValue: v,
                  })),
                },
                showCustomUi: true,
                strict: false,
              },
            },
          },
        ],
      },
    });
    console.log(
      `${LOG} Verify dropdown set on "${tab.title}" (col ${verifyIdx + 1})`
    );
  } catch (error) {
    console.warn(
      `${LOG} Verify dropdown failed:`,
      error instanceof Error ? error.message : error
    );
  }
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

/** Column A = Order Number — one tab */
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
  const exists = values.some((row) =>
    orderKeysMatch(String(row?.[0] ?? ""), orderNumber)
  );
  console.log(
    `${LOG} Order Number ${orderNumber} already in "${tabName}":`,
    exists
  );
  return exists;
}

/**
 * True if the order already exists on Sheet1 or any month tab.
 * Prevents Shopify update webhooks from re-inserting archive orders into the current month.
 */
async function orderNumberExistsOnAnyOrdersTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  orderNumber: string
): Promise<{ exists: boolean; tabTitle?: string }> {
  const { tabs } = await listTabs(sheets, spreadsheetId);
  const orderTabs = ordersTabsFromList(tabs);
  for (const tab of orderTabs) {
    if (
      await orderNumberAlreadyExists(
        sheets,
        spreadsheetId,
        tab.title,
        orderNumber
      )
    ) {
      return { exists: true, tabTitle: tab.title };
    }
  }
  return { exists: false };
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
 * Multi-item orders: merge order-level columns; product columns stay split.
 * Always inserts one blank separator row under the new order block.
 */
export async function appendOrderRows(
  rows: string[][],
  orderNumber: string | number
): Promise<AppendOrderResult> {
  if (!rows.length) {
    console.log(`${LOG} No rows to append — skipping`);
    return { written: false, skipped: true, reason: "no_rows" };
  }

  const orderKey = normalizeOrderKey(orderNumber);
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
    const { spreadsheetId, tabOverride } = getSpreadsheetConfig();
    const tab = await resolveOrCreateOrdersTab(
      sheets,
      spreadsheetId,
      tabOverride
    );

    await ensureHeaderRow(sheets, spreadsheetId, tab);

    const anywhere = await orderNumberExistsOnAnyOrdersTab(
      sheets,
      spreadsheetId,
      orderKey
    );
    if (anywhere.exists) {
      console.log(
        `${LOG} Skipping duplicate — order ${orderKey} already on "${anywhere.tabTitle}" (not re-inserting into "${tab.title}")`
      );
      return {
        written: false,
        skipped: true,
        reason: "already_exists",
      };
    }

    // Product rows + 1 blank separator under the block
    const productCount = rows.length;
    const insertCount = productCount + 1;
    console.log(
      `${LOG} Inserting ${productCount} product row(s) + 1 blank separator at top for order ${orderKey}`
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

    // Merge order-level columns across multi-item product rows (rows 2..1+n)
    if (productCount > 1 && MERGE_COL_INDEXES.length) {
      const startRowIndex = 1; // 0-based sheet row 2
      const endRowIndex = 1 + productCount;
      const mergeRequests = MERGE_COL_INDEXES.map((c0) => ({
        mergeCells: {
          range: {
            sheetId: tab.sheetId,
            startRowIndex,
            endRowIndex,
            startColumnIndex: c0,
            endColumnIndex: c0 + 1,
          },
          mergeType: "MERGE_ALL" as const,
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: mergeRequests },
      });
      console.log(
        `${LOG} Merged ${MERGE_COL_INDEXES.length} order-level column(s) across ${productCount} rows`
      );
    }

    // Colour Order Status on the first product row (merged when multi-item)
    await paintOrderStatusCells(sheets, spreadsheetId, tab.sheetId, [
      {
        rowIndex0: 1,
        status: String(rows[0]?.[STATUS_COL_INDEX] ?? ""),
      },
    ]);

    return {
      written: true,
      skipped: false,
      rows: productCount,
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
 * Updates Order Status on matching rows across Sheet1 + all month tabs.
 * Does not create a new row if the order only exists on an older tab.
 */
export async function updateOrderStatuses(
  orderNumber: string | number,
  orderStatus: string
): Promise<UpdateOrderStatusResult> {
  const orderKey = normalizeOrderKey(orderNumber);
  if (!orderKey) {
    return { updated: false, rowsUpdated: 0, reason: "missing_order_number" };
  }

  const sheets = getSheetsClient();
  const { spreadsheetId, tabOverride } = getSpreadsheetConfig();

  const { tabs: allTabs } = await listTabs(sheets, spreadsheetId);
  let orderTabs = ordersTabsFromList(allTabs);

  if (tabOverride) {
    const forced = await findTabByTitle(allTabs, tabOverride);
    if (forced && !orderTabs.some((t) => t.sheetId === forced.sheetId)) {
      orderTabs = [forced, ...orderTabs];
    }
  }

  if (!orderTabs.length) {
    await resolveOrCreateOrdersTab(sheets, spreadsheetId, tabOverride);
    return { updated: false, rowsUpdated: 0, reason: "not_found" };
  }

  const protectedStatuses = new Set([
    "delivered",
    "deliverd",
    "in transit",
    "out for delivery",
    "re-attempt advice",
  ]);

  let totalUpdated = 0;
  let foundAnywhere = false;
  let onlyProtected = false;

  for (const tab of orderTabs) {
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
      console.warn(
        `${LOG} Order Status column missing on "${tab.title}" — skip`
      );
      continue;
    }

    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(tab.title, "A:A"),
      majorDimension: "ROWS",
    });
    const values = colA.data.values ?? [];
    const rowIndexes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (orderKeysMatch(String(values[i]?.[0] ?? ""), orderKey)) {
        rowIndexes.push(i + 1);
      }
    }

    if (!rowIndexes.length) continue;
    foundAnywhere = true;
    console.log(
      `${LOG} Found order ${orderKey} on "${tab.title}" (${rowIndexes.length} row(s))`
    );

    const statusLetter = columnToLetter(statusCol);
    const existingStatusRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: rowIndexes.map(
        (row) => sheetRange(tab.title, `${statusLetter}${row}`)
      ),
    });

    const data: { range: string; values: string[][] }[] = [];
    for (let i = 0; i < rowIndexes.length; i++) {
      const current = String(
        existingStatusRes.data.valueRanges?.[i]?.values?.[0]?.[0] ?? ""
      )
        .trim()
        .toLowerCase();
      if (protectedStatuses.has(current) || current.startsWith("error:")) {
        console.log(
          `${LOG} Skipping Order Status overwrite on "${tab.title}" row ${rowIndexes[i]} (current: ${current})`
        );
        onlyProtected = true;
        continue;
      }
      data.push({
        range: sheetRange(tab.title, `${statusLetter}${rowIndexes[i]}`),
        values: [[orderStatus]],
      });
    }

    if (!data.length) continue;

    console.log(
      `${LOG} Updating Order Status for order ${orderKey} on "${tab.title}" (${data.length} row(s)):`,
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
        const match = item.range.match(/![A-Z]+(\d+)$/i);
        const row1Based = match ? Number(match[1]) : 0;
        return {
          rowIndex0: Math.max(row1Based - 1, 0),
          status: orderStatus,
        };
      })
    );

    totalUpdated += data.length;
  }

  if (!foundAnywhere) {
    console.log(
      `${LOG} No rows found for order ${orderKey} on any orders tab (Sheet1 / month tabs)`
    );
    return { updated: false, rowsUpdated: 0, reason: "not_found" };
  }

  if (!totalUpdated && onlyProtected) {
    return { updated: true, rowsUpdated: 0, reason: "protected_status" };
  }

  return { updated: true, rowsUpdated: totalUpdated };
}
