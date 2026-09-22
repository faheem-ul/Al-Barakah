import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { listSocialPostsPaginated } from "@/lib/social/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const cursor = request.nextUrl.searchParams.get("cursor");

  try {
    const page = await listSocialPostsPaginated({
      limit,
      cursor: cursor?.trim() || null,
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error("[social/posts] Failed to list posts", error);
    return NextResponse.json(
      { error: "Could not load publishing history." },
      { status: 500 },
    );
  }
}
