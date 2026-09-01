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
  SYNC_URL: "https://www.albarakahoney.com/api/shopify/orders/mark-delivered",
  /**
   * Lookup customer checkout email via Shopify Admin (Order Number).
   * Same host as SYNC_URL; leave blank to derive from SYNC_URL.
   */
  CUSTOMER_CONTACT_URL:
    "https://www.albarakahoney.com/api/shopify/orders/customer-contact",
  /** Must match SHEET_TO_SHOPIFY_SYNC_SECRET in Next.js .env.local */
  SYNC_SECRET:
    "7beddfe5b6d434edc53e97eb7c3f420e01bd492f6fa51d8786538a6f6c06a806",
  /** Public site — logo + review QR must be deployed under /public */
  SITE_BASE_URL: "https://www.albarakahoney.com",
  LOGO_URL: "https://www.albarakahoney.com/logo.png",
  REVIEW_QR_URL: "https://www.albarakahoney.com/google-review-qr.png",
  GOOGLE_REVIEW_URL: "https://g.page/r/Cb5ju-Dzbs1nEBM/review",
  SUPPORT_PHONE: "+92 325 6957327",
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
    VERIFY: "Verify",
    TRACKING_LOCATION: "Tracking Location",
    TRACKING_DETAIL: "Tracking Detail",
    ADDITIONAL_NOTE: "Additional Note",
    ADDRESS: "Address",
    CITY: "City",
    PRODUCT_DETAIL: "Product Detail",
    BOTTLE_SIZE: "Bottle Size",
    QUANTITY: "Quantity",
    COD: "COD",
    TOTAL_AMOUNT: "Total Amount",
  },
  VERIFY_VALUES: {
    FALSE: "false",
    TRUE: "true",
    DONE: "already done",
  },
  /**
   * M&P COD API. Password is Script property MP_PASSWORD only (never commit it).
   * Service: Overnight for ≤1 kg; Second Day when total bottle weight is above 1 kg.
   */
  MP_API: {
    BASE: "https://mnpcourier.com/mycodapi/api",
    USERNAME: "ALBARAKAHONEY.COM_1A1150",
    ACCOUNT_NO: "1A1150",
    DEFAULT_WEIGHT: 1,
    SERVICE_OVERNIGHT: "Overnight",
    SERVICE_SECOND_DAY: "Second Day",
    /** Orders heavier than this (kg) book as Second Day */
    SECOND_DAY_ABOVE_KG: 1,
    /** Same rider note on every booking (any weight / service) */
    REMARKS:
      "Must call before delivery. Deliver as soon as possible. Attempted 3 times to deliver. In case of any problem , call our helpline number 03256957327.",
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
  addVerifyColumn();

  log_("Next: run authorizeExternalRequests once, then re-edit the CN cell");
  log_("Set Script property MP_PASSWORD before using the Verify column");
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
 * Also touches MailApp so Gmail send stays authorized for status emails.
 */
function authorizeExternalRequests() {
  log_("===== authorizeExternalRequests START =====");
  var url = CONFIG.TRACKING_BASE_URL + "545928110002811";
  log_("Test fetch:", url);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  log_("HTTP status:", response.getResponseCode());
  log_("Body bytes:", response.getContentText().length);
  // Force mail scope re-prompt if missing (hourly triggers can lose send_mail auth)
  log_("Mail remaining daily quota:", MailApp.getRemainingDailyQuota());
  log_(
    "===== authorizeExternalRequests DONE — now re-run refresh or re-edit CN =====",
  );
}

/**
 * Run once when logs show:
 * ADMIN EMAIL FAILED: You do not have permission to call MailApp.sendEmail
 * Review → Allow, then check inbox for the test message.
 */
function authorizeMailSend() {
  log_("===== authorizeMailSend START =====");
  var to = CONFIG.NOTIFY_EMAIL;
  MailApp.sendEmail({
    to: to,
    subject: "Al Barakah — mail permission OK",
    body:
      "Apps Script can send mail again. Status-change emails will resume on the next real status change.",
    name: "Al Barakah Honey Tracking",
  });
  log_("Test email sent to", to, "| remaining quota:", MailApp.getRemainingDailyQuota());
  log_("===== authorizeMailSend DONE =====");
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
  var verifyCol = cols[CONFIG.HEADERS.VERIFY];
  var editedCol = e.range.getColumn();

  if (verifyCol && editedCol === verifyCol) {
    handleVerifyEdit_(sheet, cols, e);
    return;
  }

  if (!numberCol) {
    log_("ERROR — Tracking Number column not found in headers");
    return;
  }
  log_("Tracking Number column index:", numberCol);

  if (editedCol !== numberCol) {
    log_("Ignored — edit was not in Tracking Number or Verify column");
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

function normalizeVerifyValue_(value) {
  if (value === true || value === 1) return CONFIG.VERIFY_VALUES.TRUE;
  if (value === false || value === 0) return CONFIG.VERIFY_VALUES.FALSE;
  var text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (text === "true" || text === "yes") return CONFIG.VERIFY_VALUES.TRUE;
  if (text === "false" || text === "no") return CONFIG.VERIFY_VALUES.FALSE;
  if (text === "already done" || text === "done" || text === "alreadydone") {
    return CONFIG.VERIFY_VALUES.DONE;
  }
  return text;
}

function handleVerifyEdit_(sheet, cols, e) {
  log_("===== handleVerifyEdit =====");
  var verifyCol = cols[CONFIG.HEADERS.VERIFY];
  var row = e.range.getRow();
  var merged = e.range.getMergedRanges();
  if (merged && merged.length) {
    row = merged[0].getRow();
  }

  var raw = e.value;
  if (raw === undefined || raw === null || raw === "") {
    raw = sheet.getRange(row, verifyCol).getValue();
  }
  var verify = normalizeVerifyValue_(raw);
  log_("Row:", row, "| verify:", verify);

  if (verify !== CONFIG.VERIFY_VALUES.TRUE) {
    log_("Not true — no booking");
    return;
  }

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(15000)) {
    log_("Could not lock sheet — skip (another booking in progress)");
    return;
  }
  try {
    bookMpFromVerifyRow_(sheet, cols, row);
  } finally {
    lock.releaseLock();
  }
  log_("===== handleVerifyEdit DONE =====");
}

function bookMpFromVerifyRow_(sheet, cols, row) {
  var numberCol = cols[CONFIG.HEADERS.TRACKING_NUMBER];
  var verifyCol = cols[CONFIG.HEADERS.VERIFY];
  var existingCn = numberCol
    ? String(sheet.getRange(row, numberCol).getValue() || "")
        .trim()
        .replace(/\D/g, "")
    : "";
  if (existingCn.length >= 7) {
    log_("CN already on sheet — marking already done", existingCn);
    sheet.getRange(row, verifyCol).setValue(CONFIG.VERIFY_VALUES.DONE);
    refreshRowMpTracking_(sheet, cols, row, existingCn, true);
    markBookedIfTrackingEmpty_(sheet, cols, row);
    return;
  }

  var payload = buildMpBookingPayload_(sheet, cols, row);
  if (payload.error) {
    log_("Booking blocked:", payload.error);
    writeVerifyError_(sheet, cols, row, payload.error);
    return;
  }

  var result = insertMpBooking_(payload.body);
  if (!result.ok && isAlreadyBookedMessage_(result.message)) {
    log_("M&P says order reference already exists — looking up CN");
    var lookedUp = lookupMpCnByOrderRef_(
      payload.body.custRefNo,
      getMpApiCreds_()
    );
    if (lookedUp.cn) {
      result = { ok: true, cn: lookedUp.cn };
    }
  }
  if (!result.ok) {
    log_("InsertBookingData failed:", result.message);
    writeVerifyError_(sheet, cols, row, result.message);
    return;
  }

  var cn = String(result.cn || "").replace(/\D/g, "");
  log_("Booked CN:", cn);
  if (!cn) {
    writeVerifyError_(sheet, cols, row, "M&P returned no consignment number");
    return;
  }

  sheet.getRange(row, verifyCol).setValue(CONFIG.VERIFY_VALUES.DONE);
  if (numberCol) {
    var cnCell = sheet.getRange(row, numberCol);
    cnCell.setNumberFormat("@");
    cnCell.setValue(cn);
  }
  refreshRowMpTracking_(sheet, cols, row, cn, true);
  markBookedIfTrackingEmpty_(sheet, cols, row);
}

function markBookedIfTrackingEmpty_(sheet, cols, row) {
  var statusCol = cols[CONFIG.HEADERS.ORDER_STATUS];
  if (!statusCol) return;
  var status = String(sheet.getRange(row, statusCol).getValue() || "").trim();
  var lower = status.toLowerCase();
  if (!status || lower.indexOf("error:") === 0 || lower === "pending") {
    var cell = sheet.getRange(row, statusCol);
    cell.setValue("Booked");
    applyOrderStatusStyle_(cell, "Booked");
  }
  var locCol = cols[CONFIG.HEADERS.TRACKING_LOCATION];
  if (locCol && !String(sheet.getRange(row, locCol).getValue() || "").trim()) {
    sheet.getRange(row, locCol).setValue("LAHORE");
  }
  var detailCol = cols[CONFIG.HEADERS.TRACKING_DETAIL];
  if (!detailCol) return;
  var detail = String(sheet.getRange(row, detailCol).getValue() || "").trim();
  if (
    !detail ||
    detail.indexOf("ERROR:") === 0 ||
    detail.indexOf("Could not parse") >= 0
  ) {
    sheet.getRange(row, detailCol).setValue(
      "Booked in M&P portal. Public tracking may update later."
    );
  }
}

function waitForMpTracking_(cn, attempts, delayMs) {
  var last = { ok: false, error: "no attempt" };
  for (var i = 0; i < attempts; i++) {
    if (i > 0) Utilities.sleep(delayMs);
    last = fetchMpTrackingStatus_(cn);
    if (last.ok && last.status) {
      log_("Tracking live on attempt", i + 1, last.status);
      return last;
    }
    log_("Tracking wait", i + 1, "/", attempts, last.error || "empty");
  }
  return last;
}

function writeVerifyError_(sheet, cols, row, message) {
  var numberCol = cols[CONFIG.HEADERS.TRACKING_NUMBER];
  var existingCn = numberCol
    ? String(sheet.getRange(row, numberCol).getValue() || "")
        .replace(/\D/g, "")
    : "";
  if (existingCn.length >= 7) {
    log_("Skip ERROR write — CN already on row:", existingCn);
    return;
  }
  var detailCol = cols[CONFIG.HEADERS.TRACKING_DETAIL];
  if (detailCol) {
    sheet.getRange(row, detailCol).setValue("ERROR: " + message);
  }
}

function isAlreadyBookedMessage_(message) {
  var text = String(message || "").toLowerCase();
  return (
    text.indexOf("already exists") >= 0 ||
    text.indexOf("already exist") >= 0 ||
    text.indexOf("duplicate") >= 0
  );
}

function lookupMpCnByOrderRef_(orderRef, creds) {
  if (!creds || creds.error || !orderRef) return { cn: "" };
  var url = CONFIG.MP_API.BASE + "/Reports/CN_Detail_Customer_Order_No";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      UserName: creds.username,
      Password: creds.password,
      CustomerOrderRef: String(orderRef),
      AccountNumber: creds.accountNo,
    }),
    muteHttpExceptions: true,
  });
  var text = response.getContentText();
  log_("CN_Detail_Customer_Order_No", response.getResponseCode(), text.slice(0, 400));
  var json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { cn: "" };
  }
  var row = json;
  if (Object.prototype.toString.call(json) === "[object Array]") row = json[0];
  var details = row && (row.Details || row.details);
  if (!details || !details.length) return { cn: "" };
  var cn = String(
    details[0].consignmentNumber || details[0].ConsignmentNumber || ""
  ).replace(/\D/g, "");
  return { cn: cn };
}

function cellStr_(sheet, cols, row, headerKey) {
  var col = cols[headerKey];
  if (!col) return "";
  return String(sheet.getRange(row, col).getValue() || "").trim();
}

function getOrderBlock_(sheet, cols, startRow) {
  var orderCol = cols[CONFIG.HEADERS.ORDER_NUMBER];
  if (!orderCol) return { start: startRow, count: 1 };
  var merges = sheet.getRange(startRow, orderCol).getMergedRanges();
  if (merges && merges.length) {
    return { start: merges[0].getRow(), count: merges[0].getNumRows() };
  }
  return { start: startRow, count: 1 };
}

function pakistanMobile_(raw) {
  var digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.indexOf("92") === 0) {
    digits = "0" + digits.slice(2);
  }
  if (digits.length === 10) digits = "0" + digits;
  if (digits.length === 11 && digits.charAt(0) === "0") return digits;
  return "";
}

function buildMpBookingPayload_(sheet, cols, row) {
  var block = getOrderBlock_(sheet, cols, row);
  row = block.start;
  var name = cellStr_(sheet, cols, row, CONFIG.HEADERS.NAME);
  var address = cellStr_(sheet, cols, row, CONFIG.HEADERS.ADDRESS);
  var city = cellStr_(sheet, cols, row, CONFIG.HEADERS.CITY);
  var phone = pakistanMobile_(cellStr_(sheet, cols, row, CONFIG.HEADERS.CONTACT));
  var email = cellStr_(sheet, cols, row, CONFIG.HEADERS.EMAIL);
  var orderNumber = String(
    cellStr_(sheet, cols, row, CONFIG.HEADERS.ORDER_NUMBER) || ""
  )
    .replace(/^#/, "")
    .trim();
  var total = cellStr_(sheet, cols, row, CONFIG.HEADERS.TOTAL_AMOUNT);
  var codOnly = cellStr_(sheet, cols, row, CONFIG.HEADERS.COD);
  var codAmount = parseInt(String(total || codOnly).replace(/[^\d]/g, ""), 10);
  if (!isFinite(codAmount) || codAmount < 0) codAmount = 0;

  var qtyCol = cols[CONFIG.HEADERS.QUANTITY];
  var productCol = cols[CONFIG.HEADERS.PRODUCT_DETAIL];
  var sizeCol = cols[CONFIG.HEADERS.BOTTLE_SIZE];
  var pieces = 0;
  var products = [];
  var weightKg = 0;
  for (var i = 0; i < block.count; i++) {
    var r = block.start + i;
    var q = 0;
    if (qtyCol) {
      q = Number(sheet.getRange(r, qtyCol).getValue() || 0);
      if (isFinite(q) && q > 0) pieces += q;
      else q = 0;
    }
    if (productCol) {
      var p = String(sheet.getRange(r, productCol).getValue() || "").trim();
      if (p) products.push(p);
    }
    if (sizeCol) {
      var sizeRaw = String(sheet.getRange(r, sizeCol).getValue() || "").trim();
      var unitKg = parseBottleSizeKg_(sizeRaw);
      if (unitKg > 0 && q > 0) weightKg += unitKg * q;
    }
  }
  if (pieces < 1) pieces = 1;
  if (pieces > 99) pieces = 99;
  if (!(weightKg > 0)) {
    weightKg = CONFIG.MP_API.DEFAULT_WEIGHT;
  }
  // M&P weight is typically whole kg; round up so 1.5 → 2
  var weightForApi = Math.max(1, Math.ceil(weightKg));
  var service = pickMpService_(weightKg);
  log_(
    "M&P weight",
    weightKg,
    "kg → API weight",
    weightForApi,
    "service",
    service
  );

  if (!name) return { error: "Name is empty" };
  if (!address) return { error: "Address is empty" };
  if (!city) return { error: "City is empty" };
  if (!phone) {
    return { error: "Contact must be a Pakistani mobile (03XXXXXXXXX)" };
  }
  if (!orderNumber) return { error: "Order Number is empty" };

  var creds = getMpApiCreds_();
  if (creds.error) return { error: creds.error };

  var cityMatch = matchMpCity_(city, creds);
  if (cityMatch.error) return { error: cityMatch.error };

  var ids = resolveMpLocationIds_(creds);
  if (ids.error) return { error: ids.error };

  var returnLoc = ids.returnLocation;
  if (String(returnLoc).match(/^\d+$/)) returnLoc = Number(returnLoc);

  var body = {
    username: creds.username,
    password: creds.password,
    consigneeName: name.slice(0, 50),
    consigneeAddress: address.slice(0, 255),
    consigneeMobNo: phone,
    consigneeEmail: email.slice(0, 50),
    destinationCityName: cityMatch.name,
    pieces: pieces,
    weight: weightForApi,
    codAmount: codAmount,
    custRefNo: orderNumber.slice(0, 50),
    productDetails: asciiProductDetails_(products),
    fragile: "No",
    service: service,
    remarks: CONFIG.MP_API.REMARKS,
    insuranceValue: "0",
    locationID: String(ids.locationID),
    AccountNo: creds.accountNo,
    ReturnLocation: returnLoc,
    subAccountId: Number(ids.subAccountId),
  };
  var insertTypeRaw = PropertiesService.getScriptProperties().getProperty(
    "MP_INSERT_TYPE"
  );
  if (insertTypeRaw && String(insertTypeRaw).trim() !== "") {
    body.InsertType = Number(insertTypeRaw);
  }
  return { body: body };
}

/**
 * Parse sheet "Bottle Size" (e.g. "1/2 kg", "1 kg", "500g") → kg number.
 */
function parseBottleSizeKg_(raw) {
  var s = String(raw || "")
    .toLowerCase()
    .replace(/,/g, ".")
    .trim();
  if (!s) return 0;

  if (
    /\b1\s*\/\s*2\s*(kg|kgs|kilo|kilogram)?\b/.test(s) ||
    /\bhalf\s*(kg|kilo)?\b/.test(s)
  ) {
    return 0.5;
  }

  var grams = s.match(/\b(\d+(?:\.\d+)?)\s*(g|gm|grams?)\b/);
  if (grams) {
    var g = Number(grams[1]);
    return isFinite(g) && g > 0 ? g / 1000 : 0;
  }

  var kg = s.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilogram)\b/);
  if (kg) {
    var k = Number(kg[1]);
    return isFinite(k) && k > 0 ? k : 0;
  }

  // Bare number like "1" or "0.5" treated as kg
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    var n = Number(s);
    return isFinite(n) && n > 0 ? n : 0;
  }

  return 0;
}

/**
 * Portal options: Overnight (≤1 kg) or Second Day (>1 kg).
 */
function pickMpService_(weightKg) {
  var limit = Number(CONFIG.MP_API.SECOND_DAY_ABOVE_KG);
  if (!isFinite(limit)) limit = 1;
  if (Number(weightKg) > limit) {
    return CONFIG.MP_API.SERVICE_SECOND_DAY;
  }
  return CONFIG.MP_API.SERVICE_OVERNIGHT;
}

function asciiProductDetails_(products) {
  var raw = (products || []).join("; ");
  var ascii = raw.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
  if (!ascii) ascii = "Honey";
  return ascii.slice(0, 50);
}

function getMpApiCreds_() {
  var props = PropertiesService.getScriptProperties();
  var username = (props.getProperty("MP_USERNAME") || CONFIG.MP_API.USERNAME).trim();
  var password = String(props.getProperty("MP_PASSWORD") || "").trim();
  var accountNo = (
    props.getProperty("MP_ACCOUNT_NO") || CONFIG.MP_API.ACCOUNT_NO
  ).trim();
  if (!password) {
    return {
      error:
        "Set Script property MP_PASSWORD (Apps Script → Project Settings → Script properties)",
    };
  }
  return { username: username, password: password, accountNo: accountNo };
}

function mpApiGet_(path, creds, extra) {
  var url =
    CONFIG.MP_API.BASE +
    path +
    "?username=" +
    encodeURIComponent(creds.username) +
    "&password=" +
    encodeURIComponent(creds.password) +
    "&AccountNo=" +
    encodeURIComponent(creds.accountNo);
  if (extra) {
    var keys = Object.keys(extra);
    for (var i = 0; i < keys.length; i++) {
      url +=
        "&" +
        encodeURIComponent(keys[i]) +
        "=" +
        encodeURIComponent(extra[keys[i]]);
    }
  }
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = response.getContentText();
  var code = response.getResponseCode();
  var json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { code: code, json: json, text: text };
}

function matchMpCity_(sheetCity, creds) {
  var wanted = String(sheetCity || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  var cache = CacheService.getScriptCache();
  var cached = cache.get("mp_cities_" + creds.accountNo);
  var cities = [];
  if (cached) {
    try {
      cities = JSON.parse(cached);
    } catch (e) {
      cities = [];
    }
  }
  if (!cities.length) {
    var res = mpApiGet_("/Branches/Get_Cities", creds);
    cities = extractMpCityNames_(res.json);
    if (!cities.length) {
      res = mpApiGet_("/Branches/Get_Cities_All", creds);
      cities = extractMpCityNames_(res.json);
    }
    if (cities.length) {
      cache.put("mp_cities_" + creds.accountNo, JSON.stringify(cities), 21600);
    }
  }
  if (!cities.length) {
    return { error: "Could not load M&P city list — check API login" };
  }

  var exact = "";
  var loose = "";
  for (var i = 0; i < cities.length; i++) {
    var name = String(cities[i] || "")
      .trim()
      .replace(/\s+/g, " ");
    var upper = name.toUpperCase();
    if (upper === wanted) {
      exact = name;
      break;
    }
    if (!loose && (upper.indexOf(wanted) >= 0 || wanted.indexOf(upper) >= 0)) {
      loose = name;
    }
  }
  var matched = exact || loose;
  if (!matched) {
    return { error: 'City "' + sheetCity + '" is not in the M&P city list' };
  }
  return { name: matched };
}

function extractMpCityNames_(json) {
  var names = [];
  if (!json) return names;
  var list = json;
  if (Object.prototype.toString.call(json) !== "[object Array]") {
    list = [json];
  }
  for (var i = 0; i < list.length; i++) {
    var city = list[i] && list[i].City;
    if (Object.prototype.toString.call(city) === "[object Array]") {
      for (var j = 0; j < city.length; j++) names.push(city[j]);
    }
  }
  return names;
}

function resolveMpLocationIds_(creds) {
  var props = PropertiesService.getScriptProperties();
  var subAccountId = String(props.getProperty("MP_SUB_ACCOUNT_ID") || "").trim();
  var locationID = String(props.getProperty("MP_LOCATION_ID") || "").trim();
  var returnLocation = String(
    props.getProperty("MP_RETURN_LOCATION") || ""
  ).trim();

  if (!subAccountId) {
    var subRes = mpApiGet_("/UserManagement/GetSubAccounts", creds);
    var subs =
      (subRes.json && subRes.json.locationList) ||
      (subRes.json && subRes.json.LocationList) ||
      [];
    if (subs.length) {
      var sub = pickMpSubAccount_(subs) || subs[0];
      subAccountId = String(sub.subAccountId);
      props.setProperty("MP_SUB_ACCOUNT_ID", subAccountId);
      log_("Cached MP_SUB_ACCOUNT_ID", subAccountId);
    }
  }

  if (!locationID && subAccountId) {
    var subLoc = mpApiGet_("/Locations/GetSubAccountLocations", creds, {
      SubAccountId: subAccountId,
    });
    var subLocations =
      (subLoc.json && subLoc.json.locationList) ||
      (subLoc.json && subLoc.json.LocationList) ||
      [];
    var pickedSub = pickMpLahoreLocation_(subLocations);
    if (pickedSub) {
      locationID = String(pickedSub.locationID);
      log_(
        "Using sub-account location",
        locationID,
        pickedSub.locationName || ""
      );
    }
  }

  if (!locationID) {
    var locRes = mpApiGet_("/Locations/Get_locations", creds);
    var locations =
      (locRes.json && locRes.json.locationList) ||
      (locRes.json && locRes.json.LocationList) ||
      [];
    var picked = pickMpLahoreLocation_(locations);
    if (picked) {
      locationID = String(picked.locationID);
      log_("Using Get_locations", locationID, picked.locationName || "");
    }
  }

  if (locationID) props.setProperty("MP_LOCATION_ID", locationID);
  if (!returnLocation) {
    returnLocation = locationID;
    if (returnLocation) props.setProperty("MP_RETURN_LOCATION", returnLocation);
  }

  if (!locationID) {
    return { error: "Could not resolve M&P locationID — set MP_LOCATION_ID" };
  }
  if (!subAccountId) {
    return {
      error: "Could not resolve M&P subAccountId — set MP_SUB_ACCOUNT_ID",
    };
  }
  return {
    locationID: locationID,
    returnLocation: returnLocation,
    subAccountId: subAccountId,
  };
}

function pickMpLahoreLocation_(locations) {
  if (!locations || !locations.length) return null;
  for (var i = 0; i < locations.length; i++) {
    if (String(locations[i].locationID || "") === "125467") return locations[i];
  }
  for (var j = 0; j < locations.length; j++) {
    var name = String(locations[j].locationName || "").toUpperCase();
    if (name.indexOf("LAHORE") >= 0) return locations[j];
  }
  return locations[0];
}

function pickMpSubAccount_(subs) {
  for (var i = 0; i < subs.length; i++) {
    var shipper = String(subs[i].shipperName || "").toUpperCase();
    if (shipper.indexOf("1A1150") >= 0 || shipper.indexOf("ALBARAKAH") >= 0) {
      return subs[i];
    }
  }
  return null;
}

function insertMpBooking_(body) {
  var url = CONFIG.MP_API.BASE + "/Booking/InsertBookingData";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  var text = response.getContentText();
  log_("InsertBookingData HTTP", response.getResponseCode(), text.slice(0, 500));
  var json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, message: "M&P returned non-JSON: " + text.slice(0, 180) };
  }
  var row = json;
  if (Object.prototype.toString.call(json) === "[object Array]") {
    row = json[0];
  }
  var success = isMpApiSuccess_(row);
  var cn = row && row.orderReferenceId;
  var apiMessage = (row && row.message) || "";
  if (!success || !cn) {
    return {
      ok: false,
      message: apiMessage || text.slice(0, 180) || "Booking failed",
    };
  }
  return { ok: true, cn: String(cn), message: apiMessage };
}

function isMpApiSuccess_(row) {
  if (!row) return false;
  var v = row.isSuccess;
  if (v === true || v === 1) return true;
  var text = String(v || "").toLowerCase();
  if (text !== "true") return false;
  var message = String(row.message || "").toLowerCase();
  if (!message) return true;
  if (message.indexOf("already exist") >= 0) return false;
  if (message.indexOf("fail") >= 0 || message.indexOf("error") >= 0) {
    return false;
  }
  return true;
}

/**
 * Run once after updating Code.gs so old (possibly wrong) location IDs are refetched.
 */
function clearMpApiIdCache() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty("MP_LOCATION_ID");
  props.deleteProperty("MP_RETURN_LOCATION");
  props.deleteProperty("MP_SUB_ACCOUNT_ID");
  log_("Cleared MP_LOCATION_ID / MP_RETURN_LOCATION / MP_SUB_ACCOUNT_ID");
}

function installVerifyDropdown_() {
  var sheet = getOrdersSheet_();
  ensureTrackingHeaders_();
  var cols = getHeaderMap_(sheet);
  var verifyCol = cols[CONFIG.HEADERS.VERIFY];
  if (!verifyCol) {
    log_("Verify column missing — skip dropdown");
    return;
  }
  var lastRow = Math.max(sheet.getLastRow() + 200, 50);
  var maxRows = sheet.getMaxRows();
  if (lastRow > maxRows) lastRow = maxRows;
  var range = sheet.getRange(2, verifyCol, lastRow - 1, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
      [
        CONFIG.VERIFY_VALUES.FALSE,
        CONFIG.VERIFY_VALUES.TRUE,
        CONFIG.VERIFY_VALUES.DONE,
      ],
      true
    )
    .setAllowInvalid(true)
    .build();
  range.setDataValidation(rule);
  log_("Verify dropdown installed");
}

/**
 * Run this from Apps Script to add the Verify column on the live sheet:
 * header "Verify", dropdown false / true / already done, existing orders = false.
 * Adds the column at the far right so Shopify webhook rows stay aligned until Vercel deploy.
 */
function addVerifyColumn() {
  log_("===== addVerifyColumn START =====");
  var sheet = getOrdersSheet_();
  ensureTrackingHeaders_();
  var cols = getHeaderMap_(sheet);
  if (!cols[CONFIG.HEADERS.VERIFY]) {
    appendVerifyColumn_(sheet);
    cols = getHeaderMap_(sheet);
  }
  fillEmptyVerifyFalse_(sheet, cols);
  installVerifyDropdown_();
  log_("===== addVerifyColumn DONE =====");
}

function appendVerifyColumn_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var startCol = headers.length + 1;
  while (startCol > 1 && !String(headers[startCol - 2] || "").trim()) {
    startCol--;
  }
  sheet.getRange(1, startCol).setValue(CONFIG.HEADERS.VERIFY);
  log_("Added Verify column at column", startCol);
}

function fillEmptyVerifyFalse_(sheet, cols) {
  var verifyCol = cols[CONFIG.HEADERS.VERIFY];
  var orderCol = cols[CONFIG.HEADERS.ORDER_NUMBER];
  if (!verifyCol || !orderCol) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var orderVals = sheet.getRange(2, orderCol, lastRow - 1, 1).getValues();
  var verifyVals = sheet.getRange(2, verifyCol, lastRow - 1, 1).getValues();
  var writes = [];
  for (var i = 0; i < orderVals.length; i++) {
    var hasOrder = String(orderVals[i][0] || "").trim();
    var current = String(verifyVals[i][0] || "").trim();
    if (hasOrder && !current) {
      writes.push({ row: i + 2, value: CONFIG.VERIFY_VALUES.FALSE });
    }
  }
  for (var w = 0; w < writes.length; w++) {
    sheet.getRange(writes[w].row, verifyCol).setValue(writes[w].value);
  }
  log_("Filled Verify=false on", writes.length, "order row(s)");
}

/**
 * Run once after setting MP_PASSWORD. Should log isSucces / AccountNo list.
 */
function testMpApiLogin() {
  log_("===== testMpApiLogin =====");
  var creds = getMpApiCreds_();
  if (creds.error) {
    log_("ERROR", creds.error);
    return;
  }
  var accounts = mpApiGet_("/UserManagement/GetAccounts", creds);
  log_("GetAccounts HTTP", accounts.code, (accounts.text || "").slice(0, 800));
  var cities = mpApiGet_("/Branches/Get_Cities", creds);
  log_(
    "Get_Cities HTTP",
    cities.code,
    "cities:",
    extractMpCityNames_(cities.json).length
  );
  var ids = resolveMpLocationIds_(creds);
  log_("Location IDs:", JSON.stringify(ids));
  log_("===== testMpApiLogin DONE =====");
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

  if (headerNames.indexOf(CONFIG.HEADERS.VERIFY) === -1) {
    appendVerifyColumn_(sheet);
    lastCol = Math.max(sheet.getLastColumn(), 1);
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    headerNames = headers.map(function (h) {
      return String(h || "").trim();
    });
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
    // Don't overwrite a real courier status with a parse/fetch ERROR
    var prevLower = String(previousStatus || "").toLowerCase();
    if (statusCol && (!previousStatus || prevLower.indexOf("error:") === 0)) {
      var errCell = sheet.getRange(row, statusCol);
      errCell.setValue("ERROR: " + tracked.error);
      applyOrderStatusStyle_(errCell, "ERROR");
    } else {
      log_(
        "Keeping existing Order Status (" +
          previousStatus +
          ") — fetch/parse failed",
      );
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
  var mpPrevious = String(tracked.previousStatus || "").trim();
  var trackingUrl = CONFIG.TRACKING_BASE_URL + cn;
  var checkedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "Asia/Karachi",
    "dd MMM yyyy, hh:mm a",
  );

  // WhatsApp draft on every status-change email (per-status body via /wa?type=tracking)
  var waPhone = toWhatsAppPhone_(contactNumber);
  var waLink = "";
  var waBlockHtml = "";
  var waBlockPlain = "";
  if (waPhone) {
    // Site redirect builds the emoji message — Gmail corrupts direct wa.me?text= unicode
    waLink = buildWhatsAppDraftSiteLink_(
      waPhone,
      customerName,
      orderNumber,
      status,
      cn,
    );
    waBlockHtml =
      '<p style="margin:18px 0 8px">' +
      '<a href="' +
      waLink +
      '" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:700;border-radius:6px;">Send WhatsApp update to customer</a>' +
      "</p>" +
      '<p style="color:#666;font-size:12px;margin:0 0 12px">Opens WhatsApp with a ready message (via albarakahoney.com). Tap <strong>Send</strong> to deliver it.</p>';
    waBlockPlain = "\nSend WhatsApp update to customer:\n" + waLink + "\n";
    log_("WhatsApp draft link added for", waPhone, "| status:", status);
  } else {
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
    rowHtml_("Previous status", escapeHtml_(mpPrevious || "(none)")) +
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
    (mpPrevious || "(none)") +
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
 * ASCII-only link to Next.js /wa → redirects to wa.me with emoji message.
 * Putting unicode in Gmail's wa.me href corrupts emojis to �.
 */
function buildWhatsAppDraftSiteLink_(
  phone,
  customerName,
  orderNumber,
  status,
  cn,
) {
  var base = String(CONFIG.SITE_BASE_URL || "https://www.albarakahoney.com")
    .trim()
    .replace(/\/+$/, "");
  var name =
    customerName && customerName !== "Customer" ? customerName : "Customer";
  var displayOrder = orderNumber
    ? orderNumber.indexOf("#") === 0
      ? orderNumber
      : "#" + orderNumber
    : "";
  return (
    base +
    "/wa?type=tracking&phone=" +
    encodeURIComponent(phone) +
    "&name=" +
    encodeURIComponent(name) +
    "&order=" +
    encodeURIComponent(displayOrder) +
    "&status=" +
    encodeURIComponent(status) +
    "&cn=" +
    encodeURIComponent(cn)
  );
}

/**
 * True when admin should get a WhatsApp draft button
 * (failed / re-attempt delivery statuses).
 */
function isWhatsAppDeliveryIssueStatus_(status) {
  var n = String(status || "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  if (n.indexOf("return") === 0) return false;
  return (
    n.indexOf("re-attempt") !== -1 ||
    n.indexOf("reattempt") !== -1 ||
    n.indexOf("failed deliver") !== -1 ||
    n.indexOf("failed delivery") !== -1 ||
    n.indexOf("unsuccessful") !== -1 ||
    n.indexOf("hold for advice") !== -1
  );
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
  var supportPhone = String(CONFIG.SUPPORT_PHONE || "+92 325 6957327").trim();
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
 * Fetches public tracking page and returns the latest + previous timeline events.
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
    var events = parseTrackingEventsFromHtml_(html);
    if (!events || !events.length) {
      log_("Parse failed — no order-track-step found in HTML");
      return { ok: false, error: "Could not parse tracking timeline" };
    }
    var latest = events[0];
    var previous = events.length > 1 ? events[1] : null;
    log_(
      "Parsed latest event:",
      latest.status,
      "/",
      latest.location,
      "| previous:",
      previous ? previous.status : "(none)",
    );
    return {
      ok: true,
      status: latest.status,
      location: latest.location,
      detail: latest.detail,
      datetime: latest.datetime,
      previousStatus: previous ? previous.status : "",
      previousLocation: previous ? previous.location : "",
    };
  } catch (err) {
    log_("fetch EXCEPTION:", String(err && err.message ? err.message : err));
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * Parses Mulphilog timeline steps (latest first, same order as the page).
 */
function parseTrackingEventsFromHtml_(html) {
  if (!html) return [];

  var stepRegex =
    /<div class="order-track-step([^"]*)"[\s\S]*?<p class="order-track-text-stat status">\s*([^<]+?)\s*<\/p>\s*<p class="order-track-text-stat location">\s*([^<]*?)\s*<\/p>[\s\S]*?<p class="order-track-text-stat status-message">\s*([\s\S]*?)\s*<\/p>/gi;

  var events = [];
  var match;
  while ((match = stepRegex.exec(html)) !== null) {
    events.push({
      status: cleanText_(match[2]),
      location: cleanText_(match[3]),
      detail: cleanText_(match[4]),
      datetime: "",
    });
  }

  if (!events.length) return [];

  var dateRegex = /order-track-text-sub last-date">\s*([\s\S]*?)\s*<\/span>/gi;
  var dates = [];
  var dateMatch;
  while ((dateMatch = dateRegex.exec(html)) !== null) {
    dates.push(cleanText_(dateMatch[1].replace(/<br\s*\/?>/gi, " ")));
  }
  for (var i = 0; i < events.length && i < dates.length; i++) {
    events[i].datetime = dates[i];
  }

  return events;
}

/** @deprecated use parseTrackingEventsFromHtml_ */
function parseLatestTrackingEventFromHtml_(html) {
  var events = parseTrackingEventsFromHtml_(html);
  return events.length ? events[0] : null;
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
