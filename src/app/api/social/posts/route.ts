import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { listSocialPosts } from "@/lib/social/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const posts = await listSocialPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[social/posts] Failed to list posts", error);
    return NextResponse.json(
      { error: "Could not load publishing history." },
      { status: 500 },
    );
  }
}
