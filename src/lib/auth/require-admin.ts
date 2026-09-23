import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  verifyFirebaseIdToken,
  type VerifiedAdmin,
} from "@/lib/firebase/verify-id-token";

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export type AdminAuthResult =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; response: NextResponse };

export async function requireAdmin(
  request: NextRequest,
): Promise<AdminAuthResult> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const admin = await verifyFirebaseIdToken(token);
    if (!admin) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true, admin };
  } catch (error) {
    console.error("[require-admin] Token verification failed", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Auth verification is not configured." },
        { status: 503 },
      ),
    };
  }
}
