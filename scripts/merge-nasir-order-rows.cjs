/**
 * One-off: merge Syed Muhammad Nasir Shah's 2 line-item rows (#1082).
 * Same layout as Iftekhar merge.
 *
 *   node scripts/merge-nasir-order-rows.cjs
 *   node scripts/merge-nasir-order-rows.cjs --apply
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const TARGET_ORDER_NUMBER = "1082";
const NAME_MATCH = /nasir\s+shah|syed\s+muhammad\s+nasir/i;

const MERGE_HEADERS = [
  "Order Number",
  "Date",
  "Name",
  "Address",
  "City",
  "Contact",
  "Email",
  "COD",
  "Total Amount",
  "Order Status",
  "Tracking Number",
  "Tracking Location",
  "Tracking Detail",
];

const LINE_HEADERS = [
  "Product Detail",
  "Bottle Size",
  "Quantity",
  "Retail Price",
];

function loadEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing .env.local at ${ENV_PATH}`);
  }
  const text = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizePrivateKey(raw) {
  let key = String(raw || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function sheetRange(tabName, a1) {
  const escaped = String(tabName).replace(/'/g, "''");
  return `'${escaped}'!${a1}`;
}

function columnToLetter(column1Based) {
  let temp = column1Based;
  let letter = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

function pickPreferred(a, b) {
  const as = String(a ?? "").trim();
  const bs = String(b ?? "").trim();
  if (as) return as;
  return bs;
}

async function main() {
  loadEnvLocal();
  const apply = process.argv.includes("--apply");

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const preferredTab =
    process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || "");
  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error("Missing Google Sheets env vars");
  }

  console.log(apply ? "=== APPLY ===" : "=== DRY RUN ===");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });
  const tabs =
    meta.data.sheets?.map((s) => ({
      title: s.properties?.title || "",
      sheetId: s.properties?.sheetId,
    })) || [];
  const tab =
    tabs.find((t) => t.title === preferredTab) ||
    tabs.find((t) => t.title.toLowerCase() === preferredTab.toLowerCase()) ||
    tabs[0];
  if (!tab) throw new Error("No tab found");
  console.log("Tab:", tab.title, "gid=", tab.sheetId);

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tab.title, "A1:Z"),
  });
  const values = valuesRes.data.values || [];
  const headers = (values[0] || []).map((h) => String(h || "").trim());
  const idx = (name) => headers.indexOf(name);
  const nameCol = idx("Name");
  const orderCol = idx("Order Number");
  if (nameCol < 0) throw new Error('Missing "Name" column');

  const hits = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const name = String(row[nameCol] || "");
    const order = String(row[orderCol] ?? "")
      .trim()
      .replace(/^#/, "");
    if (NAME_MATCH.test(name) || order === TARGET_ORDER_NUMBER) {
      hits.push({ r0: r, rowIndex1: r + 1, row, order });
    }
  }

  console.log(
    "Matches:",
    hits.map((h) => `row ${h.rowIndex1}`).join(", ") || "(none)"
  );
  if (hits.length < 2) {
    throw new Error(
      `Expected at least 2 Nasir Shah / #1082 rows; found ${hits.length}.`
    );
  }

  let pair = null;
  for (let i = 0; i < hits.length - 1; i++) {
    if (hits[i].r0 + 1 === hits[i + 1].r0) {
      pair = [hits[i], hits[i + 1]];
      break;
    }
  }
  if (!pair) {
    pair = [hits[0], hits[1]];
    console.warn("WARNING: rows not adjacent — using first two hits");
  }

  const [top, bottom] = pair;
  console.log(`Merging sheet rows ${top.rowIndex1} + ${bottom.rowIndex1}`);

  const mergeColIndexes = [];
  for (const h of MERGE_HEADERS) {
    const c = idx(h);
    if (c >= 0) mergeColIndexes.push({ header: h, c0: c });
    else console.warn("Skip missing header:", h);
  }

  const mergedValuesByCol = {};
  for (const { header, c0 } of mergeColIndexes) {
    let preferred = pickPreferred(top.row[c0], bottom.row[c0]);
    if (header === "Order Number") preferred = TARGET_ORDER_NUMBER;
    if (
      (header === "COD" || header === "Total Amount") &&
      !String(top.row[c0] || "").trim() &&
      String(bottom.row[c0] || "").trim()
    ) {
      preferred = String(bottom.row[c0]).trim();
    }
    // Prefer numeric COD/Total when top has "//" junk
    if (
      (header === "COD" || header === "Total Amount" || header === "Retail Price") &&
      String(preferred).includes("//")
    ) {
      preferred = pickPreferred(bottom.row[c0], top.row[c0]);
      if (String(preferred).includes("//")) preferred = preferred.replace(/\/+/g, "").trim();
    }
    if (header === "COD" && (!preferred || preferred === "//")) {
      preferred = pickPreferred(top.row[c0], bottom.row[c0]);
      if (!preferred || preferred === "//") preferred = "0";
    }
    mergedValuesByCol[c0] = preferred;
  }

  console.log("\nOrder-level values:");
  for (const { header, c0 } of mergeColIndexes) {
    console.log(`  ${header}: ${mergedValuesByCol[c0] || "(empty)"}`);
  }
  console.log("\nLine items remain split:");
  for (const h of LINE_HEADERS) {
    const c = idx(h);
    if (c < 0) continue;
    console.log(
      `  ${h}: "${String(top.row[c] || "").trim()}" | "${String(bottom.row[c] || "").trim()}"`
    );
  }

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to write.");
    return;
  }

  const data = [];
  for (const { c0 } of mergeColIndexes) {
    const letter = columnToLetter(c0 + 1);
    data.push({
      range: sheetRange(tab.title, `${letter}${top.rowIndex1}`),
      values: [[mergedValuesByCol[c0] || ""]],
    });
    data.push({
      range: sheetRange(tab.title, `${letter}${bottom.rowIndex1}`),
      values: [[mergedValuesByCol[c0] || ""]],
    });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });

  const startRow = top.r0;
  const endRow = bottom.r0 + 1;
  const mergeRequests = mergeColIndexes.map(({ c0 }) => ({
    mergeCells: {
      range: {
        sheetId: tab.sheetId,
        startRowIndex: startRow,
        endRowIndex: endRow,
        startColumnIndex: c0,
        endColumnIndex: c0 + 1,
      },
      mergeType: "MERGE_ALL",
    },
  }));

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: {
                sheetId: tab.sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
            },
          },
          ...mergeRequests,
        ],
      },
    });
  } catch (err) {
    console.warn("Unmerge+merge failed, merges only:", err.message || err);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: mergeRequests },
    });
  }

  console.log(
    `\nDone. Merged rows ${top.rowIndex1}-${bottom.rowIndex1}. Order Number ${TARGET_ORDER_NUMBER}.`
  );
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
