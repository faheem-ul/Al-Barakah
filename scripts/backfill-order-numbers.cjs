/**
 * Backfill blank Google Sheet "Order Number" cells from a Shopify orders CSV.
 * NEVER inserts new rows — only updates existing blank Order Number cells.
 *
 * Usage:
 *   node scripts/backfill-order-numbers.mjs "C:\\Users\\seebi\\Downloads\\orders_export_1.csv"
 *   node scripts/backfill-order-numbers.mjs "path\\to\\orders.csv" --apply
 *
 * Default is dry-run (print matches only).
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");

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

function columnToLetter(column) {
  let temp = column;
  let letter = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

/** Minimal CSV parser with quoted fields. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h || "").trim());
  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = rows[r][c] ?? "";
    }
    records.push(obj);
  }
  return { headers, records };
}

function digitsPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("92") && d.length >= 12) d = "0" + d.slice(2);
  if (d.length === 10) d = "0" + d;
  return d;
}

function normEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function normName(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normOrderNumber(raw) {
  return String(raw || "")
    .trim()
    .replace(/^#/, "");
}

function normMoney(raw) {
  const n = Number(String(raw || "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function normDateKey(raw) {
  // Sheet: DD/MM/YYYY — CSV: 2026-08-10 18:17:06 +0500
  const s = String(raw || "").trim();
  if (!s) return "";
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

/**
 * Shopify CSV repeats order rows for line items; order name blank on continuations.
 * Collapse to one order record (first non-blank fields; sum lineitems not needed for match).
 */
function collapseShopifyOrders(records) {
  const orders = [];
  let current = null;
  for (const rec of records) {
    const name = String(rec.Name || "").trim();
    if (name) {
      current = {
        orderNumber: normOrderNumber(name),
        email: normEmail(rec.Email),
        billingName: normName(rec["Billing Name"]),
        shippingName: normName(rec["Shipping Name"]),
        phone: digitsPhone(
          rec["Shipping Phone"] || rec["Billing Phone"] || rec.Phone
        ),
        total: normMoney(rec.Total),
        createdDate: normDateKey(rec["Created at"]),
        rawName: String(rec["Shipping Name"] || rec["Billing Name"] || "").trim(),
      };
      if (current.orderNumber) orders.push(current);
    }
    // continuation lines ignored for identity (order-level fields already set)
  }
  return orders;
}

function scoreMatch(sheetRow, order) {
  let score = 0;
  const reasons = [];

  if (sheetRow.email && order.email && sheetRow.email === order.email) {
    score += 50;
    reasons.push("email");
  }
  if (sheetRow.phone && order.phone && sheetRow.phone === order.phone) {
    score += 40;
    reasons.push("phone");
  }
  const sheetName = sheetRow.name;
  if (sheetName) {
    if (sheetName === order.shippingName || sheetName === order.billingName) {
      score += 25;
      reasons.push("name");
    } else if (
      (order.shippingName &&
        (order.shippingName.includes(sheetName) ||
          sheetName.includes(order.shippingName))) ||
      (order.billingName &&
        (order.billingName.includes(sheetName) ||
          sheetName.includes(order.billingName)))
    ) {
      score += 15;
      reasons.push("name~");
    }
  }
  if (
    sheetRow.total != null &&
    order.total != null &&
    Math.abs(sheetRow.total - order.total) < 0.01
  ) {
    score += 15;
    reasons.push("total");
  }
  if (
    sheetRow.dateKey &&
    order.createdDate &&
    sheetRow.dateKey === order.createdDate
  ) {
    score += 10;
    reasons.push("date");
  }

  // Soft penalty: only weak signals
  return { score, reasons };
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const csvPath = args.find((a) => !a.startsWith("--"));
  if (!csvPath) {
    console.error(
      'Usage: node scripts/backfill-order-numbers.mjs "<path-to-orders.csv>" [--apply]'
    );
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const preferredTab =
    process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || "");

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error("Missing Google Sheets env vars in .env.local");
  }

  console.log(apply ? "=== APPLY MODE ===" : "=== DRY RUN (no writes) ===");
  console.log("CSV:", csvPath);

  const csvText = fs.readFileSync(csvPath, "utf8");
  const { records } = parseCsv(csvText);
  const orders = collapseShopifyOrders(records);
  console.log("Shopify orders in CSV:", orders.length);

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
    tabs.find(
      (t) => t.title.toLowerCase() === preferredTab.toLowerCase()
    ) ||
    tabs[0];
  if (!tab) throw new Error("No sheet tabs found");
  console.log("Using tab:", tab.title);

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tab.title, "A1:Z"),
  });
  const values = valuesRes.data.values || [];
  if (values.length < 2) {
    console.log("Sheet has no data rows.");
    return;
  }

  const headers = values[0].map((h) => String(h || "").trim());
  const idx = (name) => headers.indexOf(name);
  const colOrder = idx("Order Number");
  const colDate = idx("Date");
  const colName = idx("Name");
  const colContact = idx("Contact");
  const colEmail = idx("Email");
  const colTotal = idx("Total Amount");
  const colStatus = idx("Order Status");
  const colTracking = idx("Tracking Number");

  if (colOrder < 0) throw new Error('Missing "Order Number" header');

  const usedOrderNumbers = new Set();
  const blankRows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const orderNum = normOrderNumber(row[colOrder] || "");
    if (orderNum) {
      usedOrderNumbers.add(orderNum);
      continue;
    }
    blankRows.push({
      rowIndex1: r + 1, // 1-based sheet row
      name: normName(row[colName] || ""),
      rawName: String(row[colName] || "").trim(),
      email: normEmail(colEmail >= 0 ? row[colEmail] || "" : ""),
      phone: digitsPhone(colContact >= 0 ? row[colContact] || "" : ""),
      total: colTotal >= 0 ? normMoney(row[colTotal] || "") : null,
      dateKey: colDate >= 0 ? normDateKey(row[colDate] || "") : "",
      status: colStatus >= 0 ? String(row[colStatus] || "").trim() : "",
      tracking: colTracking >= 0 ? String(row[colTracking] || "").trim() : "",
    });
  }

  console.log("Sheet rows with blank Order Number:", blankRows.length);
  console.log("Order Numbers already on sheet:", usedOrderNumbers.size);

  const availableOrders = orders.filter(
    (o) => o.orderNumber && !usedOrderNumbers.has(o.orderNumber)
  );

  const matches = [];
  const ambiguous = [];
  const unmatched = [];
  const assigned = new Set();

  for (const sheetRow of blankRows) {
    const candidates = [];
    for (const order of availableOrders) {
      if (assigned.has(order.orderNumber)) continue;
      const { score, reasons } = scoreMatch(sheetRow, order);
      // Require a meaningful identity signal + score threshold
      const hasIdentity =
        reasons.includes("email") ||
        reasons.includes("phone") ||
        reasons.includes("name") ||
        reasons.includes("name~");
      if (!hasIdentity || score < 40) continue;
      candidates.push({ order, score, reasons });
    }
    candidates.sort((a, b) => b.score - a.score);

    if (!candidates.length) {
      unmatched.push(sheetRow);
      continue;
    }

    const best = candidates[0];
    const second = candidates[1];
    if (second && second.score === best.score) {
      ambiguous.push({
        sheetRow,
        options: candidates.slice(0, 3).map((c) => ({
          orderNumber: c.order.orderNumber,
          score: c.score,
          reasons: c.reasons.join("+"),
        })),
      });
      continue;
    }

    // Prefer uniqueness for weak name-only matches when many same-name tests
    if (
      !best.reasons.includes("email") &&
      !best.reasons.includes("phone") &&
      best.score < 55 &&
      second &&
      best.score - second.score < 15
    ) {
      ambiguous.push({
        sheetRow,
        options: candidates.slice(0, 3).map((c) => ({
          orderNumber: c.order.orderNumber,
          score: c.score,
          reasons: c.reasons.join("+"),
        })),
      });
      continue;
    }

    assigned.add(best.order.orderNumber);
    matches.push({
      sheetRow,
      orderNumber: best.order.orderNumber,
      score: best.score,
      reasons: best.reasons.join("+"),
      csvEmail: best.order.email,
      csvName: best.order.rawName,
    });
  }

  console.log("\n--- MATCHES (will write Order Number) ---");
  if (!matches.length) console.log("(none)");
  for (const m of matches) {
    console.log(
      `Row ${m.sheetRow.rowIndex1}: "${m.sheetRow.rawName}" ` +
        `email=${m.sheetRow.email || "—"} phone=${m.sheetRow.phone || "—"} ` +
        `total=${m.sheetRow.total ?? "—"} ` +
        `→ #${m.orderNumber} (${m.reasons}, score=${m.score}) ` +
        `[status=${m.sheetRow.status || "—"} tracking=${m.sheetRow.tracking || "—"}]`
    );
  }

  console.log("\n--- AMBIGUOUS (skipped) ---");
  if (!ambiguous.length) console.log("(none)");
  for (const a of ambiguous) {
    console.log(
      `Row ${a.sheetRow.rowIndex1}: "${a.sheetRow.rawName}" phone=${a.sheetRow.phone || "—"} email=${a.sheetRow.email || "—"}`
    );
    for (const o of a.options) {
      console.log(`   ? #${o.orderNumber} score=${o.score} (${o.reasons})`);
    }
  }

  console.log("\n--- UNMATCHED blank rows (skipped) ---");
  if (!unmatched.length) console.log("(none)");
  for (const u of unmatched) {
    console.log(
      `Row ${u.rowIndex1}: "${u.rawName}" email=${u.email || "—"} phone=${u.phone || "—"} total=${u.total ?? "—"} date=${u.dateKey || "—"}`
    );
  }

  console.log(
    `\nSummary: match=${matches.length} ambiguous=${ambiguous.length} unmatched=${unmatched.length}`
  );

  if (!apply) {
    console.log(
      "\nDry-run complete. Re-run with --apply to write Order Numbers to the sheet."
    );
    return;
  }

  if (!matches.length) {
    console.log("Nothing to write.");
    return;
  }

  const data = matches.map((m) => ({
    range: sheetRange(
      tab.title,
      `${columnToLetter(colOrder + 1)}${m.sheetRow.rowIndex1}`
    ),
    values: [[m.orderNumber]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });

  console.log(`\nWrote Order Number on ${matches.length} existing row(s). No new rows added.`);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
