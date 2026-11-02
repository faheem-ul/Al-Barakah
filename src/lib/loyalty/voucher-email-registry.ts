import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

const LOG = "[Loyalty Voucher Registry]";
export const LOYALTY_VOUCHER_SENDS_COLLECTION = "loyalty-voucher-sends";

export type LoyaltyVoucherSendStatus = "pending" | "sent";

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

/**
 * Reserve a send slot for this order (one voucher email per order number).
 */
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

  await ref.delete();
}
