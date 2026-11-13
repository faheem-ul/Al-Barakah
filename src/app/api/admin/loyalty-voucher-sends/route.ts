import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listLoyaltyVoucherSends,
  type LoyaltyVoucherSendStatus,
} from "@/lib/loyalty/voucher-email-registry";
import { resolveVoucherCodeUsage } from "@/lib/shopify/admin/loyalty-discount-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function parseStatus(
  value: string | null,
): LoyaltyVoucherSendStatus | "all" {
  const raw = value?.trim().toLowerCase();
  if (raw === "sent" || raw === "failed" || raw === "pending") return raw;
  return "all";
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const status = parseStatus(request.nextUrl.searchParams.get("status"));

  try {
    const records = await listLoyaltyVoucherSends({ limit, status });
    const usage = await resolveVoucherCodeUsage(
      records.map((r) => ({
        key: r.id,
        discountCode: r.discountCode,
        shopifyDiscountId: r.shopifyDiscountId,
      })),
    );
    const items = records.map((r) => ({
      ...r,
      codeUsed: usage.get(r.id) ?? null,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[loyalty-voucher-sends] list failed", error);
    return NextResponse.json(
      { error: "Could not load voucher email history." },
      { status: 500 },
    );
  }
}
