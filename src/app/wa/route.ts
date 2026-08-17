import { NextRequest, NextResponse } from "next/server";

import {
  buildDeliveryIssueWhatsAppDraft,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp/delivery-issue-draft";

/**
 * GET /wa?phone=&name=&order=&status=&cn=
 * Instant redirect → WhatsApp with emoji-safe prefilled message.
 * Email buttons link here (ASCII query only) so Gmail cannot corrupt emojis.
 */
export function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const phone = normalizeWhatsAppPhone(sp.get("phone") || "");

  if (!phone) {
    return new NextResponse(
      "Missing or invalid phone. Close this tab and use the contact number from the tracking email.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const text = buildDeliveryIssueWhatsAppDraft({
    name: sp.get("name") || undefined,
    order: sp.get("order") || undefined,
    status: sp.get("status") || undefined,
    cn: sp.get("cn") || undefined,
  });

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  return NextResponse.redirect(waUrl, 302);
}
