# M&P tracking status in Google Sheet

Paste an M&P consignment number into **Tracking Number**. Apps Script fills **Order Status**, **Tracking Location**, and **Tracking Detail** using the public page:

`https://www.mulphilog.com/tracking/{CONSIGNMENT}`

No M&P COD portal login is required.

## Ops sheet columns (filled by Shopify webhook + this script)

| Header            | Who fills it                                        |
| ----------------- | --------------------------------------------------- |
| Order Number      | Shopify webhook                                     |
| Date              | Shopify webhook                                     |
| Name              | Shopify webhook                                     |
| Address           | Shopify webhook                                     |
| City              | Shopify webhook                                     |
| Contact           | Shopify webhook                                     |
| Email             | Shopify webhook (checkout email)                    |
| Product Detail    | Shopify webhook                                     |
| Bottle Size       | Shopify webhook                                     |
| Quantity          | Shopify webhook                                     |
| Retail Price      | Shopify webhook                                     |
| COD               | Shopify webhook (shipping)                          |
| Total Amount      | Shopify webhook (Retail + COD)                      |
| Order Status      | Webhook starts as `Pending`; script sets M&P status |
| Tracking Number   | You (paste CN, min 7 digits)                        |
| Tracking Location | Script                                              |
| Tracking Detail   | Script                                              |

Rows whose **Order Status** is already `Delivered` are skipped on the hourly refresh.

New Shopify orders are **inserted at the top** of the sheet (under the header), with a **blank separator row** under each order block.

Multi-item carts write **one merged order block**: shared fields (name, address, contact, email, COD, total, status, tracking) span the product rows; **Product Detail / Bottle Size / Quantity / Retail Price** stay split per line.

## Auto Paid + Fulfilled in Shopify (when Delivered)

When **Order Status** changes to `Delivered` (from M&P), Apps Script calls your Next.js API, which uses the **Shopify Admin API** to:

1. Find the order by **Order Number**
2. **Mark as paid** if still unpaid (COD)
3. **Fulfill** the order with the tracking CN + Mulphilog URL

### Setup

1. In Shopify Admin → **Settings → Apps → Develop apps** → create a custom app with scopes:
   - `read_orders`
   - `write_orders`
   - `write_merchant_managed_fulfillment_orders` (and/or fulfillment write scopes your shop exposes)
2. Install the app and copy the **Admin API access token**.
3. In Next.js `.env.local` set:

```env
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_ADMIN_API_VERSION=2024-10
SHEET_TO_SHOPIFY_SYNC_SECRET=long-random-string
```

4. In Apps Script `CONFIG` (top of `Code.gs`) set:

```js
SYNC_URL: "https://www.albarakahoney.com/api/shopify/orders/mark-delivered",
CUSTOMER_CONTACT_URL: "https://www.albarakahoney.com/api/shopify/orders/customer-contact",
SYNC_SECRET: "same-long-random-string-as-env",
```

Use the live site host (same as Shopify webhooks). Leave blank to disable sync / customer email lookup.

5. Paste the latest `Code.gs` → Save → run **`installMpTrackingTriggers`** again if needed.

**Notes**

- Rows with a **blank Order Number** (legacy seed rows) are skipped — Shopify sync only works for webhook-created rows.
- Already paid + fulfilled orders are skipped (idempotent).
- Warm the route once: open `GET /api/shopify/orders/mark-delivered` in the browser after deploying.

## One-time install / fix `script.external_request` ERROR

1. Copy the latest [`Code.gs`](./Code.gs) into Apps Script (replace all) → **Save**.
2. Keep [`appsscript.json`](./appsscript.json) as you already have it (with `script.external_request`).
3. Function dropdown → **`authorizeExternalRequests`** → **Run**  
   → Advanced → Go to Untitled project → **Allow**.  
   Execution log should show `HTTP status: 200` (not a permission error).
4. Function dropdown → **`installMpTrackingTriggers`** → **Run**.  
   Log should mention both hourly trigger **and** `handleTrackingNumberEdit`.
5. In the sheet: clear the Tracking Number cell → paste CN again → Enter.  
   Or run **`refreshAllMpTrackingStatuses`**.

Order Status / Location / Detail should fill with real M&P data.

**Order Status colours**

- **Green** — Delivered
- **Yellow** — Pending and other in-progress statuses (Booked, In-transit, Re-Attempt, etc.)
- **Red** — Return / ERROR / unsuccessful

If some Order Status cells look uncoloured (common after bulk paste), in Apps Script run **`fixOrderStatusColors`** once.

## Daily usage

1. Shopify order row appears at the **top** of the sheet.
2. After you ship with M&P, paste the consignment number into **Tracking Number**.
3. Status fills shortly after the edit; status also refreshes every hour until **Delivered**.
4. When status becomes **Delivered**, Shopify is marked **Paid** (if unpaid) + **Fulfilled** automatically (if sync is configured).

## Manual full refresh

In Apps Script, run **`refreshAllMpTrackingStatuses`**.

## Viewing logs

1. Open **Extensions → Apps Script**.
2. Left sidebar → **Executions**.
3. Open a recent run (`authorizeExternalRequests`, `handleTrackingNumberEdit`, `refreshAllMpTrackingStatuses`, etc.).
4. Logs are prefixed with `[M&P Tracking]`. Look for `Shopify sync HTTP` when Delivered fires.

## Tracking status email alerts

Whenever **Order Status** changes from M&P (hourly job or after you paste/edit a CN), Apps Script sends **two** emails:

### 1. Admin

- **To:** `thealbarakahoney@gmail.com`
- **Subject:** `Tracking update: {Name} — CN {number} is now "{Status}"`
- **Body:** customer name, contact number, order number, CN, previous→current status (both from the M&P timeline), location, tracking detail, Additional Note, tracking link
- Email still sends only when **sheet** Order Status changes; Previous/Current in the email are read from Mulphilog (latest event + the one under it)
- On admin emails where **Current status** is a delivery issue (**Re-Attempt Advice**, **Failed Delivered**, **Unsuccessful Delivery Attempt**, **Hold for Advice**, etc.), a green **Send WhatsApp update to customer** button appears if Contact has a phone
- Button opens `https://www.albarakahoney.com/wa?...` (ASCII params) → instant redirect to WhatsApp with the emoji-safe draft; admin taps Send
- Direct `wa.me?text=` from Gmail is avoided (Gmail corrupts emoji characters)

### 2. Customer (checkout email from sheet)

- **Email source:** Shopify **orders webhook** writes the checkout email into the sheet **Email** column (works on Basic plans). Apps Script reads that cell — Admin API email lookup is blocked on Basic and is only a fallback.
- Branded HTML uses `public/logo.png` (from `https://www.albarakahoney.com/logo.png`) and support **+92 325 6957327**.
- Same layout every time; **subject + intro change** by stage:
  - **First send** (from blank/Pending): `Order #{n} shipped — tracking {CN} ({Status})`
  - **Later updates:** `Order #{n} update — now {Status}`
  - **Delivered:** `Order #{n} delivered — thank you! Please leave a review`  
    Includes Google review CTA + QR (`/google-review-qr.png`) for  
    `https://g.page/r/Cb5ju-Dzbs1nEBM/review`
- Skipped when Email is blank (legacy rows): paste the email manually, or use new orders after the webhook starts writing Email.

**Deploy note:** `logo.png` + `google-review-qr.png` must be live on the site root for inline email images to load. Until then, Delivered emails fall back to a generated QR for the same review URL.

Update `CONFIG.NOTIFY_EMAIL` in `Code.gs` if the inbox should change.

## Notes / caveats

- Status is scraped from M&P’s public HTML timeline. If they redesign the page, the parser may need an update.
- Public lookups can be rate-limited; the script waits ~1.2s between rows.
- Do **not** rename `handleTrackingNumberEdit` back to `onEdit` — simple `onEdit` cannot call `UrlFetchApp`.
- After deploying the new Next.js column layout, clear or archive old header rows if the sheet still has the previous column set — the next webhook will rewrite headers when it detects the old layout.
