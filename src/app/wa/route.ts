import { NextRequest, NextResponse } from "next/server";

import {
  buildWhatsAppDraft,
  normalizeWhatsAppPhone,
  type WhatsAppDraftType,
} from "@/lib/whatsapp/delivery-issue-draft";

/**
 * GET /wa?type=tracking|order_placed|delivery_issue|status_update&phone=&name=&order=&status=&cn=
 *
 * Builds the emoji message on the server (UTF-8), then opens WhatsApp.
 * Email buttons must link here with ASCII-only query params — never put
 * unicode in a Gmail wa.me href (Gmail corrupts emojis to).
 *
 * Uses a tiny UTF-8 HTML page (not a bare 302) so in-app browsers / WhatsApp
 * Web keep emoji characters in the prefilled text.
 */
export function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const phone = normalizeWhatsAppPhone(sp.get("phone") || "");

  if (!phone) {
    return new NextResponse(
      "Missing or invalid phone. Close this tab and use the contact number from the email.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const typeParam = (sp.get("type") || "tracking").trim().toLowerCase();
  let type: WhatsAppDraftType = "tracking";
  if (typeParam === "order_placed") type = "order_placed";
  else if (typeParam === "delivery_issue") type = "delivery_issue";
  else if (typeParam === "status_update") type = "status_update";
  else type = "tracking";

  const text = buildWhatsAppDraft(type, {
    name: sp.get("name") || undefined,
    order: sp.get("order") || undefined,
    status: sp.get("status") || undefined,
    cn: sp.get("cn") || undefined,
  });

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const safeHref = waUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

  const html =
    `<!DOCTYPE html><html lang="en"><head>` +
    `<meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>Open WhatsApp</title>` +
    `<style>` +
    `body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f7f4ef;color:#1f150a}` +
    `a{display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700}` +
    `p{margin:0 0 16px;text-align:center;max-width:280px}` +
    `</style></head><body>` +
    `<div style="text-align:center">` +
    `<p>Opening WhatsApp with your message…</p>` +
    `<p><a id="wa" href="${safeHref}">Open WhatsApp</a></p>` +
    `</div>` +
    `<script>` +
    `location.replace(${JSON.stringify(waUrl)});` +
    `</script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
