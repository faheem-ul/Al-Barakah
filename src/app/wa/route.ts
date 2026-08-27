import { NextRequest, NextResponse } from "next/server";

import {
  buildWhatsAppDraft,
  normalizeWhatsAppPhone,
  type WhatsAppDraftType,
} from "@/lib/whatsapp/delivery-issue-draft";

/**
 * GET /wa?type=tracking|order_placed|delivery_issue|status_update&phone=&name=&order=&status=&cn=
 * Instant redirect → WhatsApp with emoji-safe prefilled message.
 * Admin tracking emails use type=tracking + status (per-status drafts).
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
  return NextResponse.redirect(waUrl, 302);
}
