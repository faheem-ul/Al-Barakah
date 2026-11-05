import "server-only";

import {
  FieldValue,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

const LOG = "[Loyalty Voucher Registry]";
export const LOYALTY_VOUCHER_SENDS_COLLECTION = "loyalty-voucher-sends";

export type LoyaltyVoucherSendStatus = "pending" | "sent" | "failed";

export type LoyaltyVoucherSendRecord = {
  status: LoyaltyVoucherSendStatus;
  email: string;
  orderNumber: string;
  tierCode: string;
  tierAmount: number;
  orderTotalPkr: number;
  discountCode?: string;
  shopifyDiscountId?: string;
  emailError?: string;
  emailProvider?: "resend" | "smtp";
  createdAt?: string;
  sentAt?: string;
  failedAt?: string;
};

export type LoyaltyVoucherSendListItem = LoyaltyVoucherSendRecord & {
  id: string;
};

export function normalizeLoyaltyCustomerEmail(
  email: string,
): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return normalized;
}

/** Firestore doc id — bare order number (no #). */
export function normalizeLoyaltyOrderKey(
  orderNumber: string | number,
): string | null {
  const raw = String(orderNumber ?? "").trim().replace(/^#+/, "");
  if (!raw) return null;
  return raw;
}

function docRefForOrder(orderNumber: string | number) {
  const key = normalizeLoyaltyOrderKey(orderNumber);
  if (!key) {
    throw new Error("Invalid loyalty order number");
  }
  return getAdminDb()
    .collection(LOYALTY_VOUCHER_SENDS_COLLECTION)
    .doc(key);
}

function isAlreadyExistsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: number | string }).code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

function displayOrderNumber(orderNumber: string | number): string {
  const key = normalizeLoyaltyOrderKey(orderNumber);
  if (!key) return "";
  return `#${key}`;
}

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString();
  }
  return undefined;
}

function mapVoucherSendDoc(
  id: string,
  data: DocumentData,
): LoyaltyVoucherSendListItem {
  const rawStatus = data.status as LoyaltyVoucherSendStatus | undefined;
  const status: LoyaltyVoucherSendStatus =
    rawStatus === "sent" || rawStatus === "failed" || rawStatus === "pending"
      ? rawStatus
      : "pending";

  const provider = data.emailProvider;
  const emailProvider =
    provider === "resend" || provider === "smtp" ? provider : undefined;

  return {
    id,
    status,
    email: String(data.email ?? ""),
    orderNumber: String(data.orderNumber ?? ""),
    tierCode: String(data.tierCode ?? ""),
    tierAmount: Number(data.tierAmount ?? 0),
    orderTotalPkr: Number(data.orderTotalPkr ?? 0),
    discountCode: data.discountCode ? String(data.discountCode) : undefined,
    shopifyDiscountId: data.shopifyDiscountId
      ? String(data.shopifyDiscountId)
      : undefined,
    emailError: data.emailError ? String(data.emailError) : undefined,
    emailProvider,
    createdAt: timestampToIso(data.createdAt),
    sentAt: timestampToIso(data.sentAt),
    failedAt: timestampToIso(data.failedAt),
  };
}

/**
 * Reserve a send slot for this order (one voucher email per order number).
 */
export async function getLoyaltyVoucherSend(
  orderNumber: string | number,
): Promise<LoyaltyVoucherSendRecord | null> {
  const key = normalizeLoyaltyOrderKey(orderNumber);
  if (!key) return null;

  const snap = await docRefForOrder(orderNumber).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data) return null;

  return mapVoucherSendDoc(key, data);
}

export async function listLoyaltyVoucherSends(params: {
  limit: number;
  status?: LoyaltyVoucherSendStatus | "all";
}): Promise<LoyaltyVoucherSendListItem[]> {
  const limit = Math.min(Math.max(params.limit, 1), 200);
  const snap = await getAdminDb()
    .collection(LOYALTY_VOUCHER_SENDS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const rows = snap.docs.map((doc: QueryDocumentSnapshot) =>
    mapVoucherSendDoc(doc.id, doc.data()),
  );

  if (!params.status || params.status === "all") {
    return rows;
  }
  return rows.filter((row) => row.status === params.status);
}

export async function persistLoyaltyVoucherDiscountCode(
  orderNumber: string | number,
  params: {
    discountCode: string;
    shopifyDiscountId?: string;
    tierCode?: string;
  },
): Promise<void> {
  const ref = docRefForOrder(orderNumber);
  await ref.update({
    discountCode: params.discountCode,
    ...(params.shopifyDiscountId
      ? { shopifyDiscountId: params.shopifyDiscountId }
      : {}),
    ...(params.tierCode ? { tierCode: params.tierCode } : {}),
  });
}

export async function claimLoyaltyVoucherSendSlot(params: {
  orderNumber: string | number;
  email: string;
  tierCode: string;
  tierAmount: number;
  orderTotalPkr: number;
  shopifyOrderId?: string | number;
}): Promise<"claimed" | "already_sent"> {
  const email = normalizeLoyaltyCustomerEmail(params.email);
  if (!email) {
    throw new Error("Invalid loyalty customer email");
  }

  const ref = docRefForOrder(params.orderNumber);
  try {
    await ref.create({
      email,
      orderNumber: displayOrderNumber(params.orderNumber),
      shopifyOrderId: params.shopifyOrderId
        ? String(params.shopifyOrderId)
        : "",
      tierCode: params.tierCode,
      tierAmount: params.tierAmount,
      orderTotalPkr: params.orderTotalPkr,
      status: "pending" satisfies LoyaltyVoucherSendStatus,
      createdAt: FieldValue.serverTimestamp(),
    });
    return "claimed";
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      return "already_sent";
    }
    throw err;
  }
}

export async function finalizeLoyaltyVoucherSend(
  orderNumber: string | number,
): Promise<void> {
  const ref = docRefForOrder(orderNumber);
  await ref.update({
    status: "sent" satisfies LoyaltyVoucherSendStatus,
    sentAt: FieldValue.serverTimestamp(),
    emailError: FieldValue.delete(),
    failedAt: FieldValue.delete(),
  });
}

export async function markLoyaltyVoucherEmailFailed(
  orderNumber: string | number,
  params: {
    emailError: string;
    emailProvider?: "resend" | "smtp";
  },
): Promise<void> {
  const ref = docRefForOrder(orderNumber);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(
      `${LOG} mark failed skipped — no doc for order ${normalizeLoyaltyOrderKey(orderNumber)}`,
    );
    return;
  }

  const errorText = params.emailError.trim().slice(0, 2000);
  await ref.update({
    status: "failed" satisfies LoyaltyVoucherSendStatus,
    failedAt: FieldValue.serverTimestamp(),
    emailError: errorText || "Email send failed",
    ...(params.emailProvider ? { emailProvider: params.emailProvider } : {}),
    sentAt: FieldValue.delete(),
  });
}

/** Remove pending claim so a later webhook retry can send. */
export async function releaseLoyaltyVoucherSendSlot(
  orderNumber: string | number,
): Promise<void> {
  const ref = docRefForOrder(orderNumber);
  const snap = await ref.get();
  if (!snap.exists) return;

  const status = snap.get("status") as LoyaltyVoucherSendStatus | undefined;
  if (status === "sent") {
    console.warn(
      `${LOG} release skipped — already sent for order ${normalizeLoyaltyOrderKey(orderNumber)}`,
    );
    return;
  }

  const discountCode = snap.get("discountCode") as string | undefined;
  if (discountCode?.trim()) {
    console.warn(
      `${LOG} release skipped — discount already created for order ${normalizeLoyaltyOrderKey(orderNumber)} (retry can resume email)`,
    );
    return;
  }

  await ref.delete();
}
