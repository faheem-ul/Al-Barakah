/**
 * M&P (mulphilog) public tracking → Google Sheet
 *
 * Paste a consignments number into the "Tracking Number" column.
 * This script fills Order Status / Tracking Location / Tracking Detail.
 *
 * Logs: Apps Script editor → Executions (clock icon) → open a run → Logs
 *        or after a manual Run: View → Logs / Execution log
 *
 * Install: see README.md in this folder.
 */

var LOG_PREFIX = "[M&P Tracking]";

var CONFIG = {
  /** Tab name at the bottom of the spreadsheet (usually Sheet1) */
  SHEET_NAME: "Sheet1",
  TRACKING_BASE_URL: "https://www.mulphilog.com/tracking/",
  /** Skip refresh when status already equals this (case-insensitive) */
  DELIVERED_STATUS: "Delivered",
  /** Pause between fetches to be polite to M&P */
  FETCH_DELAY_MS: 1200,
  /** Notify on every M&P tracking status change */
  NOTIFY_EMAIL: "thealbarakahoney@gmail.com",
  /**
   * When Order Status becomes Delivered, POST to Next.js to mark Shopify
   * order as Paid (if unpaid/COD) + Fulfilled with tracking.
   * Example: https://your-tunnel-or-domain.com/api/shopify/orders/mark-delivered
   */
  SYNC_URL:
    "https://tjz15zfl-3000.asse.devtunnels.ms/api/shopify/orders/mark-delivered",
  /**
   * Lookup customer checkout email via Shopify Admin (Order Number).
   * Same host as SYNC_URL; leave blank to derive from SYNC_URL.
   */
  CUSTOMER_CONTACT_URL:
    "https://tjz15zfl-3000.asse.devtunnels.ms/api/shopify/orders/customer-contact",
  /** Must match SHEET_TO_SHOPIFY_SYNC_SECRET in Next.js .env.local */
  SYNC_SECRET:
    "7beddfe5b6d434edc53e97eb7c3f420e01bd492f6fa51d8786538a6f6c06a806",
  /** Public site — logo + review QR must be deployed under /public */
  SITE_BASE_URL: "https://www.albarakahoney.com",
  LOGO_URL: "https://www.albarakahoney.com/logo.png",
  REVIEW_QR_URL: "https://www.albarakahoney.com/google-review-qr.png",
  GOOGLE_REVIEW_URL: "https://g.page/r/Cb5ju-Dzbs1nEBM/review",
  SUPPORT_PHONE: "+92 306 2141972",
  SUPPORT_PHONE_TEL: "+923062141972",
  /** Brand colors from the website UI */
  BRAND: {
    brown: "#302A25",
    mint: "#8FB69F",
    ink: "#1F150A",
    muted: "#6B6B6B",
    cream: "#F2EEE6",
    page: "#FDFBFF",
    white: "#FFFFFF",
    border: "#E8E2D8",
  },
  HEADERS: {
    ORDER_NUMBER: "Order Number",
    NAME: "Name",
    CONTACT: "Contact",
    EMAIL: "Email",
    TRACKING_NUMBER: "Tracking Number",
    ORDER_STATUS: "Order Status",
    TRACKING_LOCATION: "Tracking Location",
    TRACKING_DETAIL: "Tracking Detail",
    ADDITIONAL_NOTE: "Additional Note",
  },
};

function log_() {
  var parts = Array.prototype.slice.call(arguments);
  Logger.log(LOG_PREFIX + " " + parts.join(" "));
  // Also surfaces in newer Executions UI
  try {
    console.log.apply(console, [LOG_PREFIX].concat(parts));
  } catch (e) {
    // ignore if console unavailable
  }
}

/**
 * Run once manually after pasting this script (or from the README steps)
 * to create the time-driven + installable onEdit triggers.
 *
 * IMPORTANT: A simple function named onEdit() CANNOT call UrlFetchApp.
 * That is why Status showed "script.external_request" after paste.
 * We use an *installable* onEdit trigger (created here) instead.
 */
function installMpTrackingTriggers() {
  log_("===== installMpTrackingTriggers START =====");
  ensureTrackingHeaders_();
  removeMpTrackingTriggers_();

  ScriptApp.newTrigger("refreshAllMpTrackingStatuses")
    .timeBased()
    .everyHours(1)
    .create();
  log_("Installed hourly trigger → refreshAllMpTrackingStatuses");

  ScriptApp.newTrigger("handleTrackingNumberEdit")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  log_("Installed installable onEdit → handleTrackingNumberEdit");

  // Colour every Order Status cell + install rules for future edits
  fixOrderStatusColors();

  log_("Next: run authorizeExternalRequests once, then re-edit the CN cell");
  log_("===== installMpTrackingTriggers DONE =====");
}

/**
 * Run this once from the Apps Script editor to colour ALL Order Status cells
 * (seeded / webhook rows were plain text — only M&P updates got colours before).
 */
function fixOrderStatusColors() {
  log_("===== fixOrderStatusColors START =====");
  var sheet = getOrdersSheet_();
  var cols = getHeaderMap_(sheet);
  var statusCol = cols[CONFIG.HEADERS.ORDER_STATUS];
  if (!statusCol) {
    log_("ERROR — Order Status column missing");
    return;
  }
  paintAllOrderStatusColors_(sheet, statusCol);
  installOrderStatusConditionalFormatting_(sheet, statusCol);
  log_("===== fixOrderStatusColors DONE =====");
}

/**
 * Run this once if Tracking Status shows:
 * "ERROR: ... script.external_request"
 * It forces Google to ask for permission to call external URLs (UrlFetchApp).
 */
function authorizeExternalRequests() {
  log_("===== authorizeExternalRequests START =====");
  var url = CONFIG.TRACKING_BASE_URL + "545928110002811";
  log_("Test fetch:", url);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  log_("HTTP status:", response.getResponseCode());
  log_("Body bytes:", response.getContentText().length);
  log_(
    "===== authorizeExternalRequests DONE — now re-run refresh or re-edit CN =====",
  );
}

/** Removes triggers created by installMpTrackingTriggers. */
function removeMpTrackingTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    var fn = t.getHandlerFunction();
    if (
      fn === "refreshAllMpTrackingStatuses" ||
      fn === "handleTrackingNumberEdit"
    ) {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  }
  log_("Removed existing project triggers:", removed);
}

/**
 * Installable onEdit handler (NOT named onEdit).
 * Google’s simple onEdit cannot call UrlFetchApp — this one can.
 */
function handleTrackingNumberEdit(e) {
  log_("===== handleTrackingNumberEdit =====");
  if (!e || !e.range) {
    log_("No edit event / range — exit");
    return;
  }

  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  log_("Edited sheet:", sheetName, "| cell:", e.range.getA1Notation());

  if (sheetName !== CONFIG.SHEET_NAME) {
    log_("Ignored — expected sheet", CONFIG.SHEET_NAME);
    return;
  }
  if (e.range.getRow() === 1) {
    log_("Ignored — header row edit");
    return;
  }

  var cols = getHeaderMap_(sheet);
  var numberCol = cols[CONFIG.HEADERS.TRACKING_NUMBER];
  if (!numberCol) {
    log_("ERROR — Tracking Number column not found in headers");
    return;
  }
  log_("Tracking Number column index:", numberCol);

  if (e.range.getColumn() !== numberCol) {
    log_("Ignored — edit was not in Tracking Number column");
    return;
  }

  var row = e.range.getRow();
  var rawValue = e.value || sheet.getRange(row, numberCol).getValue() || "";
  var cn = String(rawValue).trim().replace(/\D/g, "");
  log_("Row:", row, "| raw:", rawValue, "| normalized CN:", cn || "(empty)");

  if (!cn || cn.length < 7) {
    log_("CN invalid or too short (<7) — clearing derived fields");
    clearTrackingDerivFields_(sheet, cols, row);
    return;
  }

  sheet.getRange(row, numberCol).setValue(cn);
  log_("Fetching status for row", row, "...");
  refreshRowMpTracking_(sheet, cols, row, cn, true);
  log_("===== handleTrackingNumberEdit DONE =====");
}

/**
 * Hourly (or manual) refresh for rows that have a CN and are not Delivered.
 */
function refreshAllMpTrackingStatuses() {
  log_(
    "===== refreshAllMpTrackingStatuses START =====",
    new Date().toISOString(),
  );
  var sheet = getOrdersSheet_();
  ensureTrackingHeaders_();
  var cols = getHeaderMap_(sheet);
  var numberCol = cols[CONFIG.HEADERS.TRACKING_NUMBER];
  var statusCol = cols[CONFIG.HEADERS.ORDER_STATUS];
  if (!numberCol || !statusCol) {
    log_(
      "ERROR — Tracking headers missing — run ensureTrackingHeaders_ / installMpTrackingTriggers",
    );
    return;
  }

  var lastRow = sheet.getLastRow();
  log_("Sheet:", CONFIG.SHEET_NAME, "| lastRow:", lastRow);
  if (lastRow < 2) {
    log_("No data rows — exit");
    return;
  }

  var numDataRows = lastRow - 1;
  var numberValues = sheet.getRange(2, numberCol, numDataRows, 1).getValues();
  var statusValues = sheet.getRange(2, statusCol, numDataRows, 1).getValues();

  var refreshed = 0;
  var skippedEmpty = 0;
  var skippedDelivered = 0;
  var failed = 0;

  for (var i = 0; i < numberValues.length; i++) {
    var row = i + 2;
    var cn = String(numberValues[i][0] || "")
      .trim()
      .replace(/\D/g, "");
    if (!cn || cn.length < 7) {
      skippedEmpty++;
      continue;
    }

    var status = String(statusValues[i][0] || "").trim();
    if (isDelivered_(status)) {
      log_("Row", row, "CN", cn, "— already Delivered — skip");
      skippedDelivered++;
      continue;
    }

    log_(
      "Row",
      row,
      "CN",
      cn,
      "current status:",
      status || "(blank)",
      "— refreshing",
    );
    var beforeFail = failed;
    try {
      refreshRowMpTracking_(sheet, cols, row, cn, false);
      // refreshRow logs errors; approximate success via status cell after
      var newStatus = String(
        sheet.getRange(row, statusCol).getValue() || "",
      ).trim();
      if (newStatus.indexOf("ERROR:") === 0) {
        failed++;
      } else {
        refreshed++;
      }
    } catch (err) {
      failed++;
      log_("Row", row, "EXCEPTION:", String(err));
    }
    Utilities.sleep(CONFIG.FETCH_DELAY_MS);
  }

  log_(
    "Summary — refreshed:",
    refreshed,
    "| skipped empty:",
    skippedEmpty,
    "| skipped Delivered:",
    skippedDelivered,
    "| failed:",
    failed,
  );

  // Keep colours consistent even when status text was written without styling
  paintAllOrderStatusColors_(sheet, statusCol);

  log_("===== refreshAllMpTrackingStatuses DONE =====");
}

/** Manual helper: refresh one CN (paste into RUN with a test number). */
function debugFetchOneTracking() {
  var cn = "545928110002811";
  log_("===== debugFetchOneTracking ===== CN:", cn);
  var result = fetchMpTrackingStatus_(cn);
  log_("Result:", JSON.stringify(result, null, 2));
  log_("===== debugFetchOneTracking DONE =====");
}

// -------------------- internals --------------------

function getOrdersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  log_("Spreadsheet:", ss.getName(), "| looking for tab:", CONFIG.SHEET_NAME);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    log_("ERROR — sheet not found:", CONFIG.SHEET_NAME);
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" not found');
  }
  return sheet;
}

function ensureTrackingHeaders_() {
  var sheet = getOrdersSheet_();
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headerNames = headers.map(function (h) {
    return String(h || "").trim();
  });

  // Physically insert Email after Contact so existing rows stay aligned.
  if (headerNames.indexOf(CONFIG.HEADERS.EMAIL) === -1) {
    var contactIdx = headerNames.indexOf("Contact"); // 0-based
    if (contactIdx >= 0) {
      sheet.insertColumnAfter(contactIdx + 1);
      sheet.getRange(1, contactIdx + 2).setValue(CONFIG.HEADERS.EMAIL);
      log_("Inserted Email column after Contact");
      lastCol = Math.max(sheet.getLastColumn(), 1);
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      headerNames = headers.map(function (h) {
        return String(h || "").trim();
      });
    } else {
      log_("Contact column missing — Email not inserted");
    }
  }

  var needed = [
    CONFIG.HEADERS.TRACKING_NUMBER,
    CONFIG.HEADERS.ORDER_STATUS,
    CONFIG.HEADERS.TRACKING_LOCATION,
    CONFIG.HEADERS.TRACKING_DETAIL,
  ];

  var missing = [];
  for (var i = 0; i < needed.length; i++) {
    if (headerNames.indexOf(needed[i]) === -1) missing.push(needed[i]);
  }
  if (!missing.length) {
    log_("Tracking headers already present");
    return;
  }

  var startCol = headerNames.length + 1;
  while (startCol > 1 && !String(headers[startCol - 2] || "").trim()) {
    startCol--;
  }

  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  log_("Added tracking headers at column", startCol, "→", missing.join(", "));
}

function getHeaderMap_(sheet) {
  ensureTrackingHeaders_();
  // Use a wide header range so late columns like "Additional Note" are found
  // even if most data rows leave them blank (getLastColumn can miss them).
  var lastCol = Math.max(sheet.getLastColumn(), 20);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var c = 0; c < headers.length; c++) {
    var name = String(headers[c] || "").trim();
    if (name) map[name] = c + 1;
  }
  log_(
    "Header map:",
    CONFIG.HEADERS.TRACKING_NUMBER + "=" + map[CONFIG.HEADERS.TRACKING_NUMBER],
    CONFIG.HEADERS.ORDER_STATUS + "=" + map[CONFIG.HEADERS.ORDER_STATUS],
    CONFIG.HEADERS.ADDITIONAL_NOTE +
      "=" +
      (map[CONFIG.HEADERS.ADDITIONAL_NOTE] || "(missing)"),
  );
  return map;
}

function isDelivered_(status) {
  return (
    String(status || "")
      .trim()
      .toLowerCase() === CONFIG.DELIVERED_STATUS.toLowerCase()
  );
}

function clearTrackingDerivFields_(sheet, cols, row) {
  log_("Clearing derived tracking fields on row", row);
  var keys = [
    CONFIG.HEADERS.ORDER_STATUS,
    CONFIG.HEADERS.TRACKING_LOCATION,
    CONFIG.HEADERS.TRACKING_DETAIL,
  ];
  for (var i = 0; i < keys.length; i++) {
    if (cols[keys[i]]) sheet.getRange(row, cols[keys[i]]).clearContent();
  }
}

function applyOrderStatusStyle_(cell, status) {
  var colors = orderStatusColors_(status);
  cell
    .setFontWeight(colors.bold ? "bold" : "normal")
    .setHorizontalAlignment("center");
  cell.setBackground(colors.bg).setFontColor(colors.fg);
}

/** Shared colour map for Order Status text. */
function orderStatusColors_(status) {
  var normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { bg: null, fg: "#000000", bold: false };
  }
  // Green — delivered
  if (normalized === "delivered" || normalized === "deliverd") {
    return { bg: "#34a853", fg: "#000000", bold: true };
  }
  // Red — return / errors / failed outcomes
  if (
    normalized.indexOf("error:") === 0 ||
    normalized === "return" ||
    normalized.indexOf("return") === 0 ||
    normalized.indexOf("unsuccessful") !== -1 ||
    normalized.indexOf("fail") !== -1
  ) {
    return { bg: "#ea4335", fg: "#000000", bold: true };
  }
  // Yellow — Pending and all other in-progress statuses
  return { bg: "#fbbc04", fg: "#000000", bold: true };
}

/** Paint every data cell in the Order Status column. */
function paintAllOrderStatusColors_(sheet, statusCol) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2 || !statusCol) return;

  var range = sheet.getRange(2, statusCol, lastRow - 1, 1);
  var values = range.getValues();
  var backgrounds = [];
  var fonts = [];
  var weights = [];

  for (var i = 0; i < values.length; i++) {
    var colors = orderStatusColors_(values[i][0]);
    backgrounds.push([colors.bg]);
    fonts.push([colors.fg]);
    weights.push([colors.bold ? "bold" : "normal"]);
  }

  range.setBackgrounds(backgrounds);
  range.setFontColors(fonts);
  range.setFontWeights(weights);
  range.setHorizontalAlignments(
    values.map(function () {
      return ["center"];
    }),
  );
  log_("Painted Order Status colours on", values.length, "row(s)");
}

/**
 * Conditional formatting so future pasted/webhook values also get coloured.
 */
function installOrderStatusConditionalFormatting_(sheet, statusCol) {
  var lastCol = Math.max(sheet.getLastColumn(), statusCol);
  var maxRows = Math.max(sheet.getMaxRows(), 2000);
  var range = sheet.getRange(2, statusCol, maxRows - 1, 1);

  // Keep non-status rules (if any) — drop previous status rules we added
  var existing = sheet.getConditionalFormatRules() || [];
  var kept = [];
  for (var i = 0; i < existing.length; i++) {
    var ranges = existing[i].getRanges();
    var overlapsStatus = false;
    for (var r = 0; r < ranges.length; r++) {
      if (ranges[r].getColumn() === statusCol) {
        overlapsStatus = true;
        break;
      }
    }
    if (!overlapsStatus) kept.push(existing[i]);
  }

  var delivered = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Delivered")
    .setBackground("#34a853")
    .setBold(true)
    .setRanges([range])
    .build();
  var deliverd = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Deliverd")
    .setBackground("#34a853")
    .setBold(true)
    .setRanges([range])
    .build();
  var returnExact = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Return")
    .setBackground("#ea4335")
    .setBold(true)
    .setRanges([range])
    .build();
  var returnPrefix = SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith("Return")
    .setBackground("#ea4335")
    .setBold(true)
    .setRanges([range])
    .build();
  var errorPrefix = SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith("ERROR:")
    .setBackground("#ea4335")
    .setBold(true)
    .setRanges([range])
    .build();
  var unsuccessful = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("Unsuccessful")
    .setBackground("#ea4335")
    .setBold(true)
    .setRanges([range])
    .build();
  // Yellow catch-all for Pending / in-progress (must be last among non-empty rules)
  var otherNonBlank = SpreadsheetApp.newConditionalFormatRule()
    .whenCellNotEmpty()
    .setBackground("#fbbc04")
    .setBold(true)
    .setRanges([range])
    .build();

  sheet.setConditionalFormatRules(
    kept.concat([
      delivered,
      deliverd,
      returnExact,
      returnPrefix,
      errorPrefix,
      unsuccessful,
      otherNonBlank,
    ]),
  );
  log_("Installed Order Status conditional formatting (col", statusCol + ")");
}

function refreshRowMpTracking_(sheet, cols, row, cn, force) {
  log_("refreshRow — row:", row, "| CN:", cn, "| force:", force);
  var statusCol = cols[CONFIG.HEADERS.ORDER_STATUS];
  var previousStatus = statusCol
    ? String(sheet.getRange(row, statusCol).getValue() || "").trim()
    : "";

  if (!force && statusCol) {
    if (isDelivered_(previousStatus)) {
      log_("Row", row, "already Delivered — skip refresh");
      return;
    }
  }

  log_("Calling mulphilog for CN", cn, "...");
  var tracked = fetchMpTrackingStatus_(cn);
  if (!tracked.ok) {
    log_("FETCH FAILED row", row, "→", tracked.error);
    if (statusCol) {
      var errCell = sheet.getRange(row, statusCol);
      errCell.setValue("ERROR: " + tracked.error);
      applyOrderStatusStyle_(errCell, "ERROR");
    }
    return;
  }

  log_(
    "Fetched OK →",
    JSON.stringify({
      status: tracked.status,
      location: tracked.location,
      detail: (tracked.detail || "").slice(0, 120),
      datetime: tracked.datetime,
    }),
  );

  var newStatus = String(tracked.status || "").trim();

  if (statusCol) {
    var statusCell = sheet.getRange(row, statusCol);
    statusCell.setValue(newStatus);
    applyOrderStatusStyle_(statusCell, newStatus);
  }
  if (cols[CONFIG.HEADERS.TRACKING_LOCATION]) {
    sheet
      .getRange(row, cols[CONFIG.HEADERS.TRACKING_LOCATION])
      .setValue(tracked.location || "");
  }
  if (cols[CONFIG.HEADERS.TRACKING_DETAIL]) {
    sheet
      .getRange(row, cols[CONFIG.HEADERS.TRACKING_DETAIL])
      .setValue(tracked.detail || "");
  }

  log_("Wrote status columns for row", row);

  if (statusChanged_(previousStatus, newStatus)) {
    log_(
      "Status changed:",
      previousStatus || "(empty)",
      "→",
      newStatus,
      "— sending email",
    );
    sendTrackingStatusEmail_(sheet, cols, row, cn, previousStatus, tracked);
    sendCustomerTrackingEmail_(sheet, cols, row, cn, previousStatus, tracked);

    if (isDelivered_(newStatus)) {
      syncDeliveredToShopify_(sheet, cols, row, cn);
    }
  } else {
    log_("Status unchanged (" + newStatus + ") — no email");
  }
}

/**
 * Tell Next.js / Shopify: this order was delivered via M&P.
 * Requires CONFIG.SYNC_URL + CONFIG.SYNC_SECRET and a Shopify Order Number.
 */
function syncDeliveredToShopify_(sheet, cols, row, cn) {
  var syncUrl = String(CONFIG.SYNC_URL || "").trim();
  var syncSecret = String(CONFIG.SYNC_SECRET || "").trim();
  if (!syncUrl || !syncSecret) {
    log_("Shopify sync skipped — set CONFIG.SYNC_URL and CONFIG.SYNC_SECRET");
    return;
  }

  var orderNumber = cols[CONFIG.HEADERS.ORDER_NUMBER]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.ORDER_NUMBER]).getValue() || "",
      ).trim()
    : "";
  if (!orderNumber) {
    log_(
      "Shopify sync skipped — blank Order Number on row",
      row,
      "(legacy / non-Shopify row)",
    );
    return;
  }

  var payload = {
    orderNumber: orderNumber,
    trackingNumber: String(cn || "").trim(),
  };
  log_("Shopify sync POST", syncUrl, JSON.stringify(payload));

  try {
    var response = UrlFetchApp.fetch(syncUrl, {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-sync-secret": syncSecret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    var text = response.getContentText();
    log_("Shopify sync HTTP", code, text.slice(0, 500));
  } catch (err) {
    log_(
      "Shopify sync EXCEPTION:",
      String(err && err.message ? err.message : err),
    );
  }
}

function statusChanged_(previousStatus, newStatus) {
  var prev = String(previousStatus || "")
    .trim()
    .toLowerCase();
  var next = String(newStatus || "")
    .trim()
    .toLowerCase();
  if (!next) return false;
  if (next.indexOf("error:") === 0) return false;
  return prev !== next;
}

function sendTrackingStatusEmail_(
  sheet,
  cols,
  row,
  cn,
  previousStatus,
  tracked,
) {
  var to = CONFIG.NOTIFY_EMAIL;
  var customerName = cols[CONFIG.HEADERS.NAME]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.NAME]).getValue() || "",
      ).trim()
    : "";
  var orderNumber = cols[CONFIG.HEADERS.ORDER_NUMBER]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.ORDER_NUMBER]).getValue() || "",
      ).trim()
    : "";
  var contactNumber = cols[CONFIG.HEADERS.CONTACT]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.CONTACT]).getValue() || "",
      ).trim()
    : "";
  var additionalNote = cols[CONFIG.HEADERS.ADDITIONAL_NOTE]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.ADDITIONAL_NOTE]).getValue() ||
          "",
      ).trim()
    : "";
  if (!customerName) customerName = "Customer";

  var status = String(tracked.status || "").trim();
  var location = String(tracked.location || "").trim();
  var detail = String(tracked.detail || "").trim();
  var trackingUrl = CONFIG.TRACKING_BASE_URL + cn;
  var checkedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "Asia/Karachi",
    "dd MMM yyyy, hh:mm a",
  );

  // First admin notice after CN is pasted (blank / Pending → first M&P status)
  var prevNorm = String(previousStatus || "")
    .trim()
    .toLowerCase();
  var isFirstTrackingEmail = !prevNorm || prevNorm === "pending";

  var waPhone = toWhatsAppPhone_(contactNumber);
  var waLink = "";
  var waBlockHtml = "";
  var waBlockPlain = "";
  if (isFirstTrackingEmail && waPhone) {
    var displayOrder = orderNumber
      ? orderNumber.indexOf("#") === 0
        ? orderNumber
        : "#" + orderNumber
      : "your order";
    var waText =
      "Assalamualaikum" +
      (customerName && customerName !== "Customer" ? " " + customerName : "") +
      ", your Al Barakah Honey order " +
      displayOrder +
      " is now *" +
      status +
      "*. Tracking number: " +
      cn +
      ". Track here: " +
      trackingUrl;
    waLink =
      "https://wa.me/" + waPhone + "?text=" + encodeURIComponent(waText);
    waBlockHtml =
      '<p style="margin:18px 0 8px">' +
      '<a href="' +
      waLink +
      '" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:700;border-radius:6px;">Send WhatsApp update to customer</a>' +
      "</p>" +
      '<p style="color:#666;font-size:12px;margin:0 0 12px">Opens WhatsApp with a ready message. Tap <strong>Send</strong> to deliver it.</p>';
    waBlockPlain =
      "\nSend WhatsApp update to customer:\n" + waLink + "\n";
    log_("WhatsApp draft link added for", waPhone);
  } else if (isFirstTrackingEmail && !waPhone) {
    log_("WhatsApp link skipped — no valid Contact phone on row", row);
  }

  var subject =
    "Tracking update: " +
    customerName +
    " — CN " +
    cn +
    ' is now "' +
    status +
    '"';

  var html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">' +
    "<p>Assalamualaikum,</p>" +
    "<p>An M&amp;P shipment status has changed.</p>" +
    '<table style="border-collapse:collapse;margin:16px 0">' +
    rowHtml_("Customer", escapeHtml_(customerName)) +
    rowHtml_("Contact", escapeHtml_(contactNumber || "—")) +
    rowHtml_("Order Number", escapeHtml_(orderNumber || "—")) +
    rowHtml_("Tracking / CN", escapeHtml_(cn)) +
    rowHtml_("Previous status", escapeHtml_(previousStatus || "(none)")) +
    rowHtml_("Current status", "<strong>" + escapeHtml_(status) + "</strong>") +
    rowHtml_("Location", escapeHtml_(location || "—")) +
    rowHtml_("Tracking Detail", escapeHtml_(detail || "—")) +
    rowHtml_("Additional Note", escapeHtml_(additionalNote || "—")) +
    rowHtml_("Checked at", escapeHtml_(checkedAt)) +
    "</table>" +
    waBlockHtml +
    '<p><a href="' +
    trackingUrl +
    '">Open M&amp;P tracking page</a></p>' +
    '<p style="color:#666;font-size:12px">Al Barakah Honey — automated tracking notice</p>' +
    "</div>";

  var plain =
    "Assalamualaikum,\n\n" +
    "M&P shipment status changed.\n\n" +
    "Customer: " +
    customerName +
    "\n" +
    "Contact: " +
    (contactNumber || "—") +
    "\n" +
    "Order Number: " +
    (orderNumber || "—") +
    "\n" +
    "Tracking / CN: " +
    cn +
    "\n" +
    "Previous status: " +
    (previousStatus || "(none)") +
    "\n" +
    "Current status: " +
    status +
    "\n" +
    "Location: " +
    (location || "—") +
    "\n" +
    "Tracking Detail: " +
    (detail || "—") +
    "\n" +
    "Additional Note: " +
    (additionalNote || "—") +
    "\n" +
    "Checked at: " +
    checkedAt +
    "\n" +
    waBlockPlain +
    "Track: " +
    trackingUrl +
    "\n";

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: plain,
      htmlBody: html,
      name: "Al Barakah Honey Tracking",
    });
    log_("Admin email sent to", to, "| subject:", subject);
  } catch (err) {
    log_("ADMIN EMAIL FAILED:", String(err && err.message ? err.message : err));
  }
}

/**
 * Normalize sheet Contact → WhatsApp wa.me digits (Pakistan-friendly).
 * Returns "" if not usable.
 */
function toWhatsAppPhone_(raw) {
  var d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.indexOf("92") === 0 && d.length >= 12) return d;
  if (d.charAt(0) === "0" && d.length >= 11) return "92" + d.slice(1);
  if (d.length === 10) return "92" + d;
  if (d.length >= 11) return d;
  return "";
}

/**
 * Email the customer on every tracking status change.
 * Looks up checkout email from Shopify Admin via Next.js (Order Number).
 */
function sendCustomerTrackingEmail_(
  sheet,
  cols,
  row,
  cn,
  previousStatus,
  tracked,
  contactOverride,
) {
  var orderNumber = cols[CONFIG.HEADERS.ORDER_NUMBER]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.ORDER_NUMBER]).getValue() || "",
      ).trim()
    : "";
  var sheetName = cols[CONFIG.HEADERS.NAME]
    ? String(
        sheet.getRange(row, cols[CONFIG.HEADERS.NAME]).getValue() || "",
      ).trim()
    : "";
  var sheetEmail = cols[CONFIG.HEADERS.EMAIL]
    ? String(sheet.getRange(row, cols[CONFIG.HEADERS.EMAIL]).getValue() || "")
        .trim()
        .toLowerCase()
    : "";

  var contact = contactOverride || null;
  if (!contact) {
    if (sheetEmail && sheetEmail.indexOf("@") !== -1) {
      contact = {
        email: sheetEmail,
        name: sheetName || "Customer",
        orderName: orderNumber
          ? orderNumber.indexOf("#") === 0
            ? orderNumber
            : "#" + orderNumber
          : "",
      };
      log_("Customer email from sheet:", sheetEmail);
    } else if (orderNumber) {
      log_("Sheet Email blank — trying Shopify Admin lookup for", orderNumber);
      contact = lookupCustomerContact_(orderNumber);
    } else {
      log_("Customer email skipped — no Email on sheet and no Order Number");
      return;
    }
  }

  if (!contact || !contact.email) {
    log_(
      "Customer email skipped — no email found (sheet + Shopify). " +
        "Paste the customer email into the Email column for this row, " +
        "or wait for a new webhook order that includes Email.",
    );
    return;
  }

  var customerName = String(contact.name || sheetName || "Customer").trim();
  var status = String(tracked.status || "").trim();
  var location = String(tracked.location || "").trim();
  var detail = String(tracked.detail || "").trim();
  var trackingUrl = CONFIG.TRACKING_BASE_URL + cn;
  var checkedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "Asia/Karachi",
    "dd MMM yyyy, hh:mm a",
  );
  var displayOrder =
    contact.orderName ||
    (orderNumber.indexOf("#") === 0 ? orderNumber : "#" + orderNumber);

  var prevNorm = String(previousStatus || "")
    .trim()
    .toLowerCase();
  var isInitial = !prevNorm || prevNorm === "pending";
  var isDelivered = isDelivered_(status);
  var reviewUrl = String(CONFIG.GOOGLE_REVIEW_URL || "").trim();
  var supportPhone = String(CONFIG.SUPPORT_PHONE || "+92 306 2141972").trim();
  var supportTel = String(CONFIG.SUPPORT_PHONE_TEL || "+923062141972").trim();
  var siteUrl = String(
    CONFIG.SITE_BASE_URL || "https://www.albarakahoney.com",
  ).trim();
  var logoUrl = String(CONFIG.LOGO_URL || siteUrl + "/logo.png").trim();
  var siteQrUrl = String(CONFIG.REVIEW_QR_URL || "").trim();
  var generatedQrUrl = reviewUrl
    ? "https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=" +
      encodeURIComponent(reviewUrl)
    : "";

  var subject;
  if (isDelivered) {
    subject =
      "Order " + displayOrder + " delivered — thank you! Please leave a review";
  } else if (isInitial) {
    subject =
      "Order " +
      displayOrder +
      " shipped — tracking " +
      cn +
      " (" +
      status +
      ")";
  } else {
    subject = "Order " + displayOrder + " update — now " + status;
  }

  var eyebrow = isDelivered
    ? "Successfully delivered"
    : isInitial
    ? "Your shipment is on the way"
    : "Shipment status update";

  var introHtml;
  var introPlain;
  if (isDelivered) {
    introHtml =
      'Great news — your Al Barakah Honey order has been <strong style="color:#1f5c3a;">delivered</strong>. ' +
      "We hope every spoon tastes like a blessing. If you loved it, a short Google review would mean the world to us.";
    introPlain =
      "Great news — your Al Barakah Honey order has been delivered. " +
      "We hope every spoon tastes like a blessing. If you loved it, a short Google review would mean the world to us.";
  } else if (isInitial) {
    introHtml =
      "Thank you for choosing Al Barakah Honey. Your order has been shipped with M&amp;P. " +
      "Please save your tracking number below so you can follow the delivery.";
    introPlain =
      "Thank you for choosing Al Barakah Honey. Your order has been shipped with M&P. " +
      "Please save your tracking number below so you can follow the delivery.";
  } else {
    introHtml =
      "Your Al Barakah Honey shipment status has changed" +
      (previousStatus
        ? " from <strong>" +
          escapeHtml_(previousStatus) +
          '</strong> to <strong style="color:#1f5c3a;">' +
          escapeHtml_(status) +
          "</strong>."
        : ' to <strong style="color:#1f5c3a;">' +
          escapeHtml_(status) +
          "</strong>.");
    introPlain =
      "Your Al Barakah Honey shipment status has changed" +
      (previousStatus
        ? ' from "' + previousStatus + '" to "' + status + '".'
        : ' to "' + status + '".');
  }

  var footerNote = isDelivered
    ? "Thank you for shopping with Al Barakah Honey. "
    : isInitial
    ? "You will receive another email whenever the courier status changes. "
    : "This message was sent because the courier status for your order changed. ";

  var brand = CONFIG.BRAND || {};
  var cBrown = brand.brown || "#302A25";
  var cMint = brand.mint || "#8FB69F";
  var cInk = brand.ink || "#1F150A";
  var cMuted = brand.muted || "#6B6B6B";
  var cCream = brand.cream || "#F2EEE6";
  var cPage = brand.page || "#FDFBFF";
  var cWhite = brand.white || "#FFFFFF";
  var cBorder = brand.border || "#E8E2D8";

  // Keep site URLs in CONFIG; until deploy, fall back so the email still looks complete.
  var inlineImages = {};
  var logoCid = "";
  var qrCid = "";
  var logoBlob = fetchEmailImageBlob_(logoUrl, "logo.png");
  if (logoBlob) {
    logoCid = "logo";
    inlineImages[logoCid] = logoBlob;
  } else {
    log_("Logo not reachable yet (", logoUrl, ") — using text brand for now");
  }

  var reviewQrSrc = "";
  if (isDelivered && reviewUrl) {
    var qrBlob = siteQrUrl
      ? fetchEmailImageBlob_(siteQrUrl, "google-review-qr.png")
      : null;
    if (!qrBlob && generatedQrUrl) {
      log_("Site QR not reachable yet — using generated QR for testing");
      qrBlob = fetchEmailImageBlob_(generatedQrUrl, "google-review-qr.png");
      reviewQrSrc = generatedQrUrl;
    } else if (qrBlob) {
      reviewQrSrc = siteQrUrl;
    } else {
      reviewQrSrc = generatedQrUrl || siteQrUrl;
    }
    if (qrBlob) {
      qrCid = "reviewqr";
      inlineImages[qrCid] = qrBlob;
    }
  }

  var logoHtml = logoCid
    ? '<img src="cid:' +
      logoCid +
      '" alt="Al Barakah Honey" width="148" style="display:block;margin:0 auto 10px;width:148px;max-width:60%;height:auto;border:0;" />'
    : '<div style="font-size:26px;letter-spacing:0.06em;color:' +
      cBrown +
      ";font-weight:700;font-family:Georgia,'Times New Roman',serif;\">Al Barakah Honey</div>" +
      '<div style="font-size:11px;color:' +
      cMint +
      ';letter-spacing:0.08em;margin-top:4px;">Pure · Natural · Blessed</div>';

  var statusBadgeColor = isDelivered
    ? cMint
    : String(status).toLowerCase().indexOf("return") >= 0
    ? "#b42318"
    : cBrown;

  if (isDelivered) {
    introHtml = introHtml.replace(/#1f5c3a/g, cMint);
  } else if (!isInitial) {
    introHtml = introHtml.replace(/#1f5c3a/g, cBrown);
  }

  var reviewBlockHtml = "";
  var reviewBlockPlain = "";
  if (isDelivered && reviewUrl) {
    var qrImgHtml = qrCid
      ? '<img src="cid:' +
        qrCid +
        '" alt="Scan to leave a Google review" width="160" height="160" style="display:block;margin:0 auto;width:160px;height:160px;border:0;" />'
      : reviewQrSrc
      ? '<img src="' +
        escapeHtml_(reviewQrSrc) +
        '" alt="Scan to leave a Google review" width="160" height="160" style="display:block;margin:0 auto;width:160px;height:160px;border:0;" />'
      : "";

    // Stacked layout (button above QR) with clear vertical gap — email-safe tables.
    reviewBlockHtml =
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;background:' +
      cCream +
      ";border:1px solid " +
      cBorder +
      ';border-radius:10px;">' +
      '<tr><td style="padding:22px 20px;text-align:center;font-family:Arial,sans-serif;">' +
      '<div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:' +
      cMuted +
      ';font-weight:700;margin-bottom:8px;">Share your experience</div>' +
      '<div style="font-size:18px;color:' +
      cBrown +
      ";font-weight:700;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;\">Would you leave us a Google review?</div>" +
      '<p style="margin:0 0 20px;font-size:14px;color:' +
      cMuted +
      ';line-height:1.55;">Your feedback helps more families find pure honey — and it only takes a minute.</p>' +
      '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;"><tr><td align="center" style="border-radius:30px;background:' +
      cBrown +
      ';">' +
      '<a href="' +
      escapeHtml_(reviewUrl) +
      '" style="display:inline-block;background:' +
      cBrown +
      ";color:" +
      cWhite +
      ';text-decoration:none;padding:14px 28px;font-size:14px;font-weight:600;border-radius:30px;line-height:1.2;">Leave a Google review</a>' +
      "</td></tr></table>" +
      (qrImgHtml
        ? '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 8px;"><tr><td align="center" style="padding:14px;background:' +
          cWhite +
          ";border:1px solid " +
          cBorder +
          ';border-radius:12px;">' +
          qrImgHtml +
          "</td></tr></table>" +
          '<p style="margin:12px 0 0;font-size:12px;color:' +
          cMuted +
          ';">Or scan this code with your phone camera</p>'
        : "") +
      "</td></tr></table>";
    reviewBlockPlain =
      "\nWould you leave us a Google review?\n" +
      reviewUrl +
      "\n(Or scan the QR code in the HTML email.)\n";
  }

  var primaryCtaHtml = isDelivered
    ? ""
    : '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 18px;"><tr><td align="center" style="border-radius:30px;background:' +
      cBrown +
      ';">' +
      '<a href="' +
      trackingUrl +
      '" style="display:inline-block;background:' +
      cBrown +
      ";color:" +
      cWhite +
      ';text-decoration:none;padding:14px 28px;font-size:14px;font-weight:600;border-radius:30px;">Track your shipment</a>' +
      "</td></tr></table>";

  var html =
    '<div style="margin:0;padding:0;background:' +
    cPage +
    ';">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' +
    cPage +
    ';padding:28px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:' +
    cWhite +
    ";border-radius:14px;overflow:hidden;border:1px solid " +
    cBorder +
    ';">' +
    '<tr><td style="padding:28px 28px 18px;text-align:center;background:' +
    cCream +
    ";border-bottom:1px solid " +
    cBorder +
    ';">' +
    logoHtml +
    '<div style="margin-top:8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:' +
    cMuted +
    ';font-family:Arial,sans-serif;font-weight:600;">' +
    escapeHtml_(eyebrow) +
    "</div>" +
    "</td></tr>" +
    '<tr><td style="padding:26px 28px 8px;font-family:Arial,sans-serif;color:' +
    cInk +
    ';font-size:15px;line-height:1.65;">' +
    '<p style="margin:0 0 14px;font-size:16px;">Assalamualaikum' +
    (customerName && customerName !== "Customer"
      ? ", <strong>" + escapeHtml_(customerName) + "</strong>"
      : "") +
    ",</p>" +
    '<p style="margin:0 0 20px;color:' +
    cInk +
    ';">' +
    introHtml +
    "</p>" +
    '<div style="margin:0 0 18px;text-align:center;">' +
    '<span style="display:inline-block;background:' +
    statusBadgeColor +
    ";color:" +
    (isDelivered ? cInk : cWhite) +
    ';font-size:13px;font-weight:700;letter-spacing:0.04em;padding:8px 16px;border-radius:999px;">' +
    escapeHtml_(status) +
    "</span></div>" +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;margin:0 0 20px;font-size:14px;border:1px solid ' +
    cBorder +
    ';border-radius:10px;overflow:hidden;">' +
    customerRowHtml_("Order number", escapeHtml_(displayOrder)) +
    customerRowHtml_(
      "Tracking number",
      '<strong style="letter-spacing:0.04em;">' + escapeHtml_(cn) + "</strong>",
    ) +
    customerRowHtml_(
      "Current status",
      '<strong style="color:' +
        cBrown +
        ';">' +
        escapeHtml_(status) +
        "</strong>",
    ) +
    customerRowHtml_("Location", escapeHtml_(location || "—")) +
    customerRowHtml_("Detail", escapeHtml_(detail || "—")) +
    customerRowHtml_("Updated", escapeHtml_(checkedAt)) +
    "</table>" +
    primaryCtaHtml +
    reviewBlockHtml +
    (!isDelivered
      ? '<p style="margin:0 0 8px;font-size:12px;color:' +
        cMuted +
        ';text-align:center;">Track anytime:<br><a href="' +
        trackingUrl +
        '" style="color:' +
        cBrown +
        ';word-break:break-all;">' +
        escapeHtml_(trackingUrl) +
        "</a></p>"
      : "") +
    "</td></tr>" +
    '<tr><td style="padding:20px 28px 28px;background:' +
    cCream +
    ";border-top:1px solid " +
    cBorder +
    ";font-family:Arial,sans-serif;font-size:13px;color:" +
    cMuted +
    ';line-height:1.55;">' +
    '<div style="margin:0 0 12px;padding:14px 16px;background:' +
    cWhite +
    ";border:1px solid " +
    cBorder +
    ';border-radius:8px;">' +
    '<strong style="color:' +
    cBrown +
    ';">Need help?</strong><br>' +
    'If you have any questions, call or WhatsApp us at <a href="tel:' +
    escapeHtml_(supportTel) +
    '" style="color:' +
    cBrown +
    ';font-weight:700;text-decoration:none;">' +
    escapeHtml_(supportPhone) +
    "</a></div>" +
    escapeHtml_(footerNote) +
    "If you did not place this order, reply to this email and we will help immediately.<br><br>" +
    'Warm regards,<br><strong style="color:' +
    cBrown +
    ';">Al Barakah Honey</strong><br>' +
    '<a href="' +
    escapeHtml_(siteUrl) +
    '" style="color:' +
    cMuted +
    ';font-size:12px;">' +
    escapeHtml_(siteUrl.replace(/^https?:\/\//, "")) +
    "</a>" +
    "</td></tr>" +
    "</table></td></tr></table></div>";

  var plain =
    "Assalamualaikum" +
    (customerName && customerName !== "Customer" ? ", " + customerName : "") +
    ",\n\n" +
    introPlain +
    "\n\n" +
    "Order number: " +
    displayOrder +
    "\n" +
    "Tracking number: " +
    cn +
    "\n" +
    "Current status: " +
    status +
    "\n" +
    "Location: " +
    (location || "—") +
    "\n" +
    "Detail: " +
    (detail || "—") +
    "\n" +
    "Updated: " +
    checkedAt +
    "\n" +
    (!isDelivered ? "\nTrack your shipment: " + trackingUrl + "\n" : "") +
    reviewBlockPlain +
    "\nNeed help?\nIf you have any questions, call or WhatsApp us at " +
    supportPhone +
    "\n\nWarm regards,\nAl Barakah Honey\n";

  try {
    var mailOpts = {
      to: contact.email,
      subject: subject,
      body: plain,
      htmlBody: html,
      name: "Al Barakah Honey",
      replyTo: CONFIG.NOTIFY_EMAIL,
    };
    var hasInline = false;
    for (var k in inlineImages) {
      if (inlineImages.hasOwnProperty(k)) {
        hasInline = true;
        break;
      }
    }
    if (hasInline) mailOpts.inlineImages = inlineImages;
    MailApp.sendEmail(mailOpts);
    log_(
      "Customer email sent to",
      contact.email,
      "|",
      isDelivered ? "delivered+review" : isInitial ? "initial" : "update",
      "| order",
      displayOrder,
      "| status",
      status,
    );
  } catch (err) {
    log_(
      "CUSTOMER EMAIL FAILED:",
      String(err && err.message ? err.message : err),
    );
  }
}

/**
 * Manual test: send sample customer emails (update + Delivered+review) to admin.
 * Run from Apps Script editor → select testCustomerTrackingEmails → Run.
 * Does not modify sheet rows.
 */
function testCustomerTrackingEmails() {
  var to = CONFIG.NOTIFY_EMAIL;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  var cols = getHeaderMap_(sheet);
  var contact = {
    email: to,
    name: "Test Customer",
    orderName: "#1090",
  };

  sendCustomerTrackingEmail_(
    sheet,
    cols,
    2,
    "7212345678901",
    "Booked",
    {
      status: "In-transit",
      location: "Lahore Hub",
      detail: "Shipment arrived at local facility",
    },
    contact,
  );

  sendCustomerTrackingEmail_(
    sheet,
    cols,
    2,
    "7212345678901",
    "In-transit",
    {
      status: "Delivered",
      location: "Lahore",
      detail: "Shipment delivered to consignee",
    },
    contact,
  );

  log_("testCustomerTrackingEmails done — check inbox:", to);
}

/**
 * Fetch an image for MailApp inlineImages (cid:...).
 */
function fetchEmailImageBlob_(url, filename) {
  if (!url) return null;
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
    });
    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      log_("Email image fetch failed", code, url);
      return null;
    }
    return response.getBlob().setName(filename || "image.png");
  } catch (err) {
    log_(
      "Email image fetch error:",
      String(err && err.message ? err.message : err),
      url,
    );
    return null;
  }
}

function customerRowHtml_(label, valueHtml) {
  return (
    "<tr>" +
    '<td style="padding:11px 14px;border-bottom:1px solid #E8E2D8;background:#F2EEE6;color:#6B6B6B;width:38%;vertical-align:top;font-size:13px;">' +
    escapeHtml_(label) +
    "</td>" +
    '<td style="padding:11px 14px;border-bottom:1px solid #E8E2D8;vertical-align:top;color:#1F150A;font-size:14px;">' +
    valueHtml +
    "</td>" +
    "</tr>"
  );
}

function resolveCustomerContactUrl_() {
  var explicit = String(CONFIG.CUSTOMER_CONTACT_URL || "").trim();
  if (explicit) return explicit;
  var syncUrl = String(CONFIG.SYNC_URL || "").trim();
  if (!syncUrl) return "";
  return syncUrl.replace(
    /\/api\/shopify\/orders\/mark-delivered\/?$/,
    "/api/shopify/orders/customer-contact",
  );
}

/**
 * POST Order Number → Next.js → Shopify Admin → { email, name, orderName }
 */
function lookupCustomerContact_(orderNumber) {
  var url = resolveCustomerContactUrl_();
  var syncSecret = String(CONFIG.SYNC_SECRET || "").trim();
  if (!url || !syncSecret) {
    log_(
      "Customer contact lookup skipped — set CUSTOMER_CONTACT_URL/SYNC_URL and SYNC_SECRET",
    );
    return null;
  }

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { "x-sync-secret": syncSecret },
      payload: JSON.stringify({
        orderNumber: String(orderNumber || "").trim(),
      }),
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    var text = response.getContentText() || "";
    log_("Customer contact HTTP", code, text.slice(0, 400));
    if (code < 200 || code >= 300) return null;
    var data = JSON.parse(text);
    if (!data || !data.ok || !data.email) return null;
    return {
      email: String(data.email || "").trim(),
      name: String(data.name || "").trim(),
      orderName: String(data.orderName || "").trim(),
    };
  } catch (err) {
    log_(
      "Customer contact lookup FAILED:",
      String(err && err.message ? err.message : err),
    );
    return null;
  }
}

function rowHtml_(label, value) {
  return (
    "<tr>" +
    '<td style="padding:6px 12px 6px 0;color:#555;vertical-align:top">' +
    escapeHtml_(label) +
    "</td>" +
    '<td style="padding:6px 0;vertical-align:top">' +
    value +
    "</td>" +
    "</tr>"
  );
}

function escapeHtml_(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fetches public tracking page and returns the latest (first) timeline event.
 * No merchant COD API credentials required.
 */
function fetchMpTrackingStatus_(consignment) {
  var url = CONFIG.TRACKING_BASE_URL + encodeURIComponent(consignment);
  log_("HTTP GET", url);
  try {
    var started = Date.now();
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AlBarakahSheetBot/1.0; +internal)",
        Accept: "text/html",
      },
    });
    var code = response.getResponseCode();
    var html = response.getContentText();
    log_(
      "HTTP status:",
      code,
      "| body bytes:",
      html ? html.length : 0,
      "| ms:",
      Date.now() - started,
    );
    if (code < 200 || code >= 300) {
      return { ok: false, error: "HTTP " + code };
    }
    var parsed = parseLatestTrackingEventFromHtml_(html);
    if (!parsed) {
      log_("Parse failed — no order-track-step found in HTML");
      return { ok: false, error: "Could not parse tracking timeline" };
    }
    log_("Parsed latest event:", parsed.status, "/", parsed.location);
    return {
      ok: true,
      status: parsed.status,
      location: parsed.location,
      detail: parsed.detail,
      datetime: parsed.datetime,
    };
  } catch (err) {
    log_("fetch EXCEPTION:", String(err && err.message ? err.message : err));
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * Parses the first order-track-step (latest event) from mulphilog HTML.
 */
function parseLatestTrackingEventFromHtml_(html) {
  if (!html) return null;

  var stepRegex =
    /<div class="order-track-step([^"]*)"[\s\S]*?<p class="order-track-text-stat status">\s*([^<]+?)\s*<\/p>\s*<p class="order-track-text-stat location">\s*([^<]*?)\s*<\/p>[\s\S]*?<p class="order-track-text-stat status-message">\s*([\s\S]*?)\s*<\/p>/i;

  var match = stepRegex.exec(html);
  if (!match) return null;

  var datetimeMatch = html.match(
    /order-track-step[\s\S]*?order-track-text-sub last-date">\s*([\s\S]*?)\s*<\/span>/i,
  );
  var datetime = datetimeMatch
    ? cleanText_(datetimeMatch[1].replace(/<br\s*\/?>/gi, " "))
    : "";

  return {
    status: cleanText_(match[2]),
    location: cleanText_(match[3]),
    detail: cleanText_(match[4]),
    datetime: datetime,
  };
}

function cleanText_(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}
