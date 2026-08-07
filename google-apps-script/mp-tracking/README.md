# M&P tracking status in Google Sheet

Paste an M&P consignment number into **Tracking Number**. Apps Script fills **Tracking URL**, **Tracking Status**, **Tracking Location**, **Tracking Detail**, and **Tracking Checked At** using the public page:

`https://www.mulphilog.com/tracking/{CONSIGNMENT}`

No M&P COD portal login is required.

## Columns

| Header | Who fills it |
|--------|----------------|
| Tracking Number | You (paste CN, min 7 digits) |
| Tracking URL | Script |
| Tracking Status | Script (latest timeline event) |
| Tracking Location | Script |
| Tracking Detail | Script |
| Tracking Checked At | Script |

Rows whose **Tracking Status** is already `Delivered` are skipped on the hourly refresh.

## One-time install / fix `script.external_request` ERROR

Your `appsscript.json` scopes are correct. The ERROR still appears when a **simple** `onEdit` tries to fetch a website — Google forbids that. The updated `Code.gs` uses an **installable** on-edit trigger instead.

1. Copy the latest [`Code.gs`](./Code.gs) into Apps Script (replace all) → **Save**.
2. Keep [`appsscript.json`](./appsscript.json) as you already have it (with `script.external_request`).
3. Function dropdown → **`authorizeExternalRequests`** → **Run**  
   → Advanced → Go to Untitled project → **Allow**.  
   Execution log should show `HTTP status: 200` (not a permission error).
4. Function dropdown → **`installMpTrackingTriggers`** → **Run**.  
   Log should mention both hourly trigger **and** `handleTrackingNumberEdit`.
5. In the sheet: clear the Tracking Number cell → paste CN again → Enter.  
   Or run **`refreshAllMpTrackingStatuses`**.

Status / Location / Detail should fill with real M&P data (e.g. Delivered / Re-Attempt Advice).

## Daily usage

1. Shopify order row appears as usual.
2. After you ship with M&P, paste the consignment number into **Tracking Number**.
3. URL + status fill shortly after the edit; status also refreshes every hour until **Delivered**.

## Manual full refresh

In Apps Script, run **`refreshAllMpTrackingStatuses`**.

## Viewing logs

1. Open **Extensions → Apps Script**.
2. Left sidebar → **Executions**.
3. Open a recent run (`authorizeExternalRequests`, `handleTrackingNumberEdit`, `refreshAllMpTrackingStatuses`, etc.).
4. Logs are prefixed with `[M&P Tracking]`.

## Tracking status email alerts

Whenever **Tracking Status** changes (hourly job or after you paste/edit a CN), Apps Script emails:

- **To:** `thealbarakahoney@gmail.com`
- **Subject:** `Tracking update: {Name} — CN {number} is now "{Status}"`
- **Body:** customer name, order number, CN, previous → current status, location, detail, tracking link

Update `CONFIG.NOTIFY_EMAIL` in `Code.gs` if the inbox should change.

After pasting the new `Code.gs` + `appsscript.json`, run any function once and **Allow** mail permission if prompted.

## Notes / caveats

- Status is scraped from M&P’s public HTML timeline. If they redesign the page, the parser may need an update.
- Public lookups can be rate-limited; the script waits ~1.2s between rows.
- Do **not** rename `handleTrackingNumberEdit` back to `onEdit` — simple `onEdit` cannot call `UrlFetchApp`.
- Next.js order writes leave these six tracking columns empty and will append headers on the next order webhook if missing.
