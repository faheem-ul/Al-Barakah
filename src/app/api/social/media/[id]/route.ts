import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase/admin";
import { SOCIAL_TEMP_MEDIA_COLLECTION } from "@/lib/social/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TempMediaDoc = {
  mimeType?: string;
  data?: string;
  sourceUrl?: string;
  expiresAt?: number;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const mediaId = String(id || "")
    .trim()
    .replace(/\.(jpe?g|png|webp)$/i, "");

  if (!mediaId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const snap = await getAdminDb()
      .collection(SOCIAL_TEMP_MEDIA_COLLECTION)
      .doc(mediaId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = snap.data() as TempMediaDoc;
    if (data.expiresAt && data.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    const mimeType = data.mimeType || "image/jpeg";
    let buffer: Buffer | null = null;

    if (data.sourceUrl) {
      const upstream = await fetch(data.sourceUrl, { cache: "no-store" });
      if (!upstream.ok) {
        console.error("[social/media] Upstream fetch failed", {
          status: upstream.status,
        });
        return NextResponse.json(
          { error: "Could not load image." },
          { status: 502 },
        );
      }
      buffer = Buffer.from(await upstream.arrayBuffer());
    } else if (data.data) {
      buffer = Buffer.from(data.data, "base64");
    }

    if (!buffer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=86400, immutable",
        "Accept-Ranges": "bytes",
        "X-Robots-Tag": "all",
      },
    });
  } catch (error) {
    console.error("[social/media] Failed to serve temp media", error);
    return NextResponse.json({ error: "Could not load image." }, { status: 500 });
  }
}
