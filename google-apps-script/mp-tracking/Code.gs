/**
 * M&P (mulphilog) public tracking → Google Sheet
 *
 * Paste a consignments number into the "Tracking Number" column.
 * This script fills Tracking URL / Status / Location / Detail / Checked At.
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
  HEADERS: {
    ORDER_NUMBER: "Order Number",
    NAME_OF_USER: "Name of User",
    TRACKING_NUMBER: "Tracking Number",
    TRACKING_URL: "Tracking URL",
    TRACKING_STATUS: "Tracking Status",
    TRACKING_LOCATION: "Tracking Location",
    TRACKING_DETAIL: "Tracking Detail",
    TRACKING_CHECKED_AT: "Tracking Checked At",
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

  log_("Next: run authorizeExternalRequests once, then re-edit the CN cell");
  log_("===== installMpTrackingTriggers DONE =====");
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
  log_("===== authorizeExternalRequests DONE — now re-run refresh or re-edit CN =====");
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
  var trackingUrl = CONFIG.TRACKING_BASE_URL + cn;
  sheet.getRange(row, cols[CONFIG.HEADERS.TRACKING_URL]).setValue(trackingUrl);
  log_("Wrote Tracking URL:", trackingUrl);

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
  var statusCol = cols[CONFIG.HEADERS.TRACKING_STATUS];
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

  var needed = [
    CONFIG.HEADERS.TRACKING_NUMBER,
    CONFIG.HEADERS.TRACKING_URL,
    CONFIG.HEADERS.TRACKING_STATUS,
    CONFIG.HEADERS.TRACKING_LOCATION,
    CONFIG.HEADERS.TRACKING_DETAIL,
    CONFIG.HEADERS.TRACKING_CHECKED_AT,
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
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var c = 0; c < headers.length; c++) {
    var name = String(headers[c] || "").trim();
    if (name) map[name] = c + 1;
  }
  log_(
    "Header map tracking cols:",
    CONFIG.HEADERS.TRACKING_NUMBER + "=" + map[CONFIG.HEADERS.TRACKING_NUMBER],
    CONFIG.HEADERS.TRACKING_STATUS + "=" + map[CONFIG.HEADERS.TRACKING_STATUS],
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
    CONFIG.HEADERS.TRACKING_URL,
    CONFIG.HEADERS.TRACKING_STATUS,
    CONFIG.HEADERS.TRACKING_LOCATION,
    CONFIG.HEADERS.TRACKING_DETAIL,
    CONFIG.HEADERS.TRACKING_CHECKED_AT,
  ];
  for (var i = 0; i < keys.length; i++) {
    if (cols[keys[i]]) sheet.getRange(row, cols[keys[i]]).clearContent();
  }
}

function refreshRowMpTracking_(sheet, cols, row, cn, force) {
  log_("refreshRow — row:", row, "| CN:", cn, "| force:", force);
  var statusCol = cols[CONFIG.HEADERS.TRACKING_STATUS];
  var previousStatus = statusCol
    ? String(sheet.getRange(row, statusCol).getValue() || "").trim()
    : "";

  if (!force && statusCol) {
    if (isDelivered_(previousStatus)) {
      log_("Row", row, "already Delivered — skip refresh");
      return;
    }
  }

  if (cols[CONFIG.HEADERS.TRACKING_URL]) {
    var url = CONFIG.TRACKING_BASE_URL + cn;
    sheet.getRange(row, cols[CONFIG.HEADERS.TRACKING_URL]).setValue(url);
    log_("Set Tracking URL:", url);
  }

  log_("Calling mulphilog for CN", cn, "...");
  var tracked = fetchMpTrackingStatus_(cn);
  if (!tracked.ok) {
    log_("FETCH FAILED row", row, "→", tracked.error);
    if (cols[CONFIG.HEADERS.TRACKING_STATUS]) {
      sheet
        .getRange(row, cols[CONFIG.HEADERS.TRACKING_STATUS])
        .setValue("ERROR: " + tracked.error);
    }
    if (cols[CONFIG.HEADERS.TRACKING_CHECKED_AT]) {
      sheet
        .getRange(row, cols[CONFIG.HEADERS.TRACKING_CHECKED_AT])
        .setValue(new Date());
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

  if (cols[CONFIG.HEADERS.TRACKING_STATUS]) {
    sheet.getRange(row, cols[CONFIG.HEADERS.TRACKING_STATUS]).setValue(newStatus);
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
  if (cols[CONFIG.HEADERS.TRACKING_CHECKED_AT]) {
    sheet
      .getRange(row, cols[CONFIG.HEADERS.TRACKING_CHECKED_AT])
      .setValue(new Date());
  }

  log_("Wrote status columns for row", row);

  if (statusChanged_(previousStatus, newStatus)) {
    log_(
      "Status changed:",
      previousStatus || "(empty)",
      "→",
      newStatus,
      "— sending email"
    );
    sendTrackingStatusEmail_(sheet, cols, row, cn, previousStatus, tracked);
  } else {
    log_("Status unchanged (" + newStatus + ") — no email");
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

function sendTrackingStatusEmail_(sheet, cols, row, cn, previousStatus, tracked) {
  var to = CONFIG.NOTIFY_EMAIL;
  var customerName = cols[CONFIG.HEADERS.NAME_OF_USER]
    ? String(sheet.getRange(row, cols[CONFIG.HEADERS.NAME_OF_USER]).getValue() || "").trim()
    : "";
  var orderNumber = cols[CONFIG.HEADERS.ORDER_NUMBER]
    ? String(sheet.getRange(row, cols[CONFIG.HEADERS.ORDER_NUMBER]).getValue() || "").trim()
    : "";
  if (!customerName) customerName = "Customer";

  var status = String(tracked.status || "").trim();
  var location = String(tracked.location || "").trim();
  var detail = String(tracked.detail || "").trim();
  var trackingUrl = CONFIG.TRACKING_BASE_URL + cn;
  var checkedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "Asia/Karachi",
    "dd MMM yyyy, hh:mm a"
  );

  var subject =
    "Tracking update: " +
    customerName +
    " — CN " +
    cn +
    " is now \"" +
    status +
    "\"";

  var html =
    "<div style=\"font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5\">" +
    "<p>Assalamualaikum,</p>" +
    "<p>An M&amp;P shipment status has changed.</p>" +
    "<table style=\"border-collapse:collapse;margin:16px 0\">" +
    rowHtml_("Customer", customerName) +
    rowHtml_("Order Number", orderNumber || "—") +
    rowHtml_("Tracking / CN", cn) +
    rowHtml_("Previous status", previousStatus || "(none)") +
    rowHtml_("Current status", "<strong>" + escapeHtml_(status) + "</strong>") +
    rowHtml_("Location", location || "—") +
    rowHtml_("Detail", detail || "—") +
    rowHtml_("Checked at", checkedAt) +
    "</table>" +
    "<p><a href=\"" +
    trackingUrl +
    "\">Open M&amp;P tracking page</a></p>" +
    "<p style=\"color:#666;font-size:12px\">Al Barakah Honey — automated tracking notice</p>" +
    "</div>";

  var plain =
    "Assalamualaikum,\n\n" +
    "M&P shipment status changed.\n\n" +
    "Customer: " +
    customerName +
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
    "Detail: " +
    (detail || "—") +
    "\n" +
    "Checked at: " +
    checkedAt +
    "\n" +
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
    log_("Email sent to", to, "| subject:", subject);
  } catch (err) {
    log_("EMAIL FAILED:", String(err && err.message ? err.message : err));
  }
}

function rowHtml_(label, value) {
  return (
    "<tr>" +
    "<td style=\"padding:6px 12px 6px 0;color:#555;vertical-align:top\">" +
    escapeHtml_(label) +
    "</td>" +
    "<td style=\"padding:6px 0;vertical-align:top\">" +
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
