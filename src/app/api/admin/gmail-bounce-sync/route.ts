import { NextRequest, NextResponse } from "next/server";

import { syncGmailLoyaltyBounces } from "@/lib/email/gmail-bounce-sync";
import { isGmailBounceSyncConfigured } from "@/lib/google/gmail-oauth-client";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  if (!isGmailBounceSyncConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gmail bounce sync is not configured. Add GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, and GMAIL_OAUTH_REFRESH_TOKEN for the same Gmail account that sends SMTP mail.",
      },
      { status: 503 },
    );
  }

  try {
    let maxMessages = 25;
    try {
      const body = (await request.json().catch(() => null)) as {
        maxMessages?: number;
      } | null;
      if (body?.maxMessages) maxMessages = body.maxMessages;
    } catch {
      // empty body is fine
    }

    const result = await syncGmailLoyaltyBounces({ maxMessages });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[gmail-bounce-sync] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync Gmail bounces.",
      },
      { status: 500 },
    );
  }
}
