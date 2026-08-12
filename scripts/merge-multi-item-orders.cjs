/**
 * Merge multi-item order row pairs on the ops sheet.
 * Usage:
 *   node scripts/merge-multi-item-orders.cjs
 *   node scripts/merge-multi-item-orders.cjs --apply
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");

/** Specs: match by order# and/or name; write order# if missing. */
const JOBS = [
  {
    orderNumber: "1050",
    nameRe: /jameel\s+khan/i,
    label: "Jameel Khan",
  },
  {
    orderNumber: "1053",
    nameRe: /fiaz\s+ahmad/i,
    label: "Fiaz Ahmad",
  },
  {
    orderNumber: "1031",
    nameRe: /musadaq|musaddaq/i,
    label: "Musadaq Ashraf Arain",
  },
  {
    orderNumber: "1071",
    nameRe: /fakhar/i,
    phoneDigits: "03256104055",
    label: "Fakhar Butt",
  },
];

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
  if (!fs.existsSync(ENV_PATH)) throw new Error("Missing .env.local");
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizePrivateKey(raw) {
  let key = String(raw || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  )
    key = key.slice(1, -1);
  return key.replace(/\\n/g, "\n");
}

function sheetRange(tabName, a1) {
  return `'${String(tabName).replace(/'/g, "''")}'!${a1}`;
}

function columnToLetter(n) {
  let temp = n;
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
  return as || bs;
}

function digitsPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("92") && d.length >= 12) d = "0" + d.slice(2);
  if (d.length === 10) d = "0" + d;
  return d;
}

function combineTracking(a, b) {
  const as = String(a ?? "").trim();
  const bs = String(b ?? "").trim();
  const junk = /have to|updated|^\(+$|^\(\s*have/i;
  const clean = (s) => (junk.test(s) ? "" : s);
  const A = clean(as);
  const B = clean(bs);
  if (!A) return B;
  if (!B) return A;
  if (A === B) return A;
  if (A.includes(B)) return A;
  if (B.includes(A)) return B;
  return `${A} / ${B}`;
}

function isPlaceholderTracking(s) {
  return /have to|updated/i.test(String(s || ""));
}

async function main() {
  loadEnvLocal();
  const apply = process.argv.includes("--apply");
  console.log(apply ? "=== APPLY ===" : "=== DRY RUN ===");

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const preferredTab = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || "");
  if (!spreadsheetId || !clientEmail || !privateKey)
    throw new Error("Missing Google Sheets env vars");

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
  console.log("Tab:", tab.title);

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tab.title, "A1:Z"),
  });
  const values = valuesRes.data.values || [];
  const headers = (values[0] || []).map((h) => String(h || "").trim());
  const idx = (name) => headers.indexOf(name);
  const nameCol = idx("Name");
  const orderCol = idx("Order Number");
  const contactCol = idx("Contact");
  if (nameCol < 0) throw new Error('Missing "Name"');

  const mergeColIndexes = MERGE_HEADERS.map((h) => ({
    header: h,
    c0: idx(h),
  })).filter((x) => x.c0 >= 0);

  const allValueUpdates = [];
  const allMergeRequests = [];

  for (const job of JOBS) {
    console.log(`\n----- ${job.label} (#${job.orderNumber}) -----`);
    const hits = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r] || [];
      const name = String(row[nameCol] || "");
      const order = String(row[orderCol] ?? "")
        .trim()
        .replace(/^#/, "");
      const phone = digitsPhone(
        contactCol >= 0 ? row[contactCol] || "" : ""
      );
      const nameOk = job.nameRe.test(name);
      const orderOk = order === job.orderNumber;
      const phoneOk = job.phoneDigits
        ? phone === job.phoneDigits || phone.endsWith(job.phoneDigits.slice(-10))
        : false;
      if (nameOk || orderOk || phoneOk) {
        hits.push({ r0: r, rowIndex1: r + 1, row, order });
      }
    }

    console.log(
      "Hits:",
      hits.map((h) => `row ${h.rowIndex1}`).join(", ") || "(none)"
    );

    // Prefer consecutive pair among hits
    let pair = null;
    for (let i = 0; i < hits.length - 1; i++) {
      if (hits[i].r0 + 1 === hits[i + 1].r0) {
        pair = [hits[i], hits[i + 1]];
        break;
      }
    }
    if (!pair && hits.length >= 2) {
      // If more than 2 name matches (unlikely), take first two consecutive by row
      hits.sort((a, b) => a.r0 - b.r0);
      for (let i = 0; i < hits.length - 1; i++) {
        if (hits[i].r0 + 1 === hits[i + 1].r0) {
          pair = [hits[i], hits[i + 1]];
          break;
        }
      }
    }
    if (!pair) {
      console.warn(`SKIP ${job.label}: could not find 2 consecutive rows`);
      continue;
    }

    const [top, bottom] = pair;
    console.log(`Merging rows ${top.rowIndex1} + ${bottom.rowIndex1}`);

    const mergedValuesByCol = {};
    for (const { header, c0 } of mergeColIndexes) {
      let preferred = pickPreferred(top.row[c0], bottom.row[c0]);
      if (header === "Order Number") preferred = job.orderNumber;
      if (header === "Tracking Number") {
        preferred = combineTracking(top.row[c0], bottom.row[c0]);
        if (isPlaceholderTracking(preferred)) preferred = "";
      }
      if (
        (header === "COD" || header === "Total Amount") &&
        !String(top.row[c0] || "").trim()
      ) {
        preferred = pickPreferred(bottom.row[c0], top.row[c0]);
      }
      if (header === "COD" && !preferred) preferred = "0";
      if (header === "Order Status") {
        const a = String(top.row[c0] || "").trim();
        const b = String(bottom.row[c0] || "").trim();
        if (/^delivered$/i.test(a) || /^delivered$/i.test(b))
          preferred = "Delivered";
        else preferred = pickPreferred(a, b);
      }
      mergedValuesByCol[c0] = preferred;
    }

    for (const { header, c0 } of mergeColIndexes) {
      console.log(`  ${header}: ${mergedValuesByCol[c0] || "(empty)"}`);
    }
    for (const h of LINE_HEADERS) {
      const c = idx(h);
      if (c < 0) continue;
      console.log(
        `  LINE ${h}: "${String(top.row[c] || "").trim()}" | "${String(bottom.row[c] || "").trim()}"`
      );
    }

    for (const { c0 } of mergeColIndexes) {
      const letter = columnToLetter(c0 + 1);
      allValueUpdates.push({
        range: sheetRange(tab.title, `${letter}${top.rowIndex1}`),
        values: [[mergedValuesByCol[c0] || ""]],
      });
      allValueUpdates.push({
        range: sheetRange(tab.title, `${letter}${bottom.rowIndex1}`),
        values: [[mergedValuesByCol[c0] || ""]],
      });
    }

    const startRow = top.r0;
    const endRow = bottom.r0 + 1;
    allMergeRequests.push({
      unmergeCells: {
        range: {
          sheetId: tab.sheetId,
          startRowIndex: startRow,
          endRowIndex: endRow,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        },
      },
    });
    for (const { c0 } of mergeColIndexes) {
      allMergeRequests.push({
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
      });
    }
  }

  if (!apply) {
    console.log(
      `\nDry-run complete (${JOBS.length} jobs). Re-run with --apply to write.`
    );
    return;
  }

  if (allValueUpdates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: allValueUpdates },
    });
  }

  if (allMergeRequests.length) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: allMergeRequests },
      });
    } catch (err) {
      console.warn(
        "Batch unmerge+merge failed; trying merges only:",
        err.message || err
      );
      const onlyMerges = allMergeRequests.filter((r) => r.mergeCells);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: onlyMerges },
      });
    }
  }

  console.log("\nDone. Merged all found pairs. No new rows added.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
