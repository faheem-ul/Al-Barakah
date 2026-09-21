import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TempMediaDoc = {
  mimeType?: string;
  data?: string;
  expiresAt?: number;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const mediaId = String(id || "").trim();
  if (!mediaId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const snap = await getAdminDb()
      .collection("social-media-temp")
      .doc(mediaId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = snap.data() as TempMediaDoc;
    if (data.expiresAt && data.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    if (!data.data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(data.data, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": data.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[social/media] Failed to serve temp media", error);
    return NextResponse.json({ error: "Could not load image." }, { status: 500 });
  }
}
