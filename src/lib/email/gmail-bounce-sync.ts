import "server-only";

import { humanizeEmailDeliveryError } from "@/lib/email/delivery-error-message";
import {
  isLikelyDeliveryFailureSubject,
  parseFailedRecipientFromBounce,
} from "@/lib/email/parse-gmail-bounce";
import { getGmailClientForBounceSync } from "@/lib/google/gmail-oauth-client";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  LOYALTY_VOUCHER_SENDS_COLLECTION,
  markLoyaltyVoucherDeliveryBounced,
  normalizeLoyaltyCustomerEmail,
} from "@/lib/loyalty/voucher-email-registry";

const LOG = "[Gmail Bounce Sync]";

const PROCESSED_META_DOC = "system/gmail-bounce-sync";

type GmailBounceSyncResult = {
  scanned: number;
  matched: number;
  updated: number;
  skippedAlreadyProcessed: number;
  errors: string[];
};

function decodeGmailBody(data: string | null | undefined): string {
  if (!data) return "";
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function collectTextFromPayload(payload: {
  mimeType?: string | null;
  body?: { data?: string | null };
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: unknown[];
  }>;
}): string {
  const chunks: string[] = [];
  const walk = (part: typeof payload) => {
    const mime = (part.mimeType || "").toLowerCase();
    if (
      (mime === "text/plain" || mime === "text/html") &&
      part.body?.data
    ) {
      const text = decodeGmailBody(part.body.data);
      chunks.push(mime === "text/html" ? text.replace(/<[^>]+>/g, " ") : text);
    }
    for (const child of part.parts ?? []) {
      walk(child as typeof payload);
    }
  };
  walk(payload);
  return chunks.join("\n");
}

async function loadProcessedMessageIds(): Promise<Set<string>> {
  const snap = await getAdminDb().doc(PROCESSED_META_DOC).get();
  const ids = snap.data()?.processedMessageIds;
  if (!Array.isArray(ids)) return new Set();
  return new Set(ids.map(String));
}

async function saveProcessedMessageIds(ids: Set<string>): Promise<void> {
  const list = [...ids].slice(-400);
  await getAdminDb().doc(PROCESSED_META_DOC).set(
    { processedMessageIds: list, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

async function findSentVoucherDocsByEmail(
  email: string,
): Promise<Array<{ id: string }>> {
  const normalized = normalizeLoyaltyCustomerEmail(email);
  if (!normalized) return [];

  const snap = await getAdminDb()
    .collection(LOYALTY_VOUCHER_SENDS_COLLECTION)
    .where("email", "==", normalized)
    .limit(20)
    .get();

  return snap.docs
    .filter((doc) => doc.get("status") === "sent")
    .map((doc) => ({ id: doc.id }));
}

export async function syncGmailLoyaltyBounces(params?: {
  maxMessages?: number;
}): Promise<GmailBounceSyncResult> {
  const result: GmailBounceSyncResult = {
    scanned: 0,
    matched: 0,
    updated: 0,
    skippedAlreadyProcessed: 0,
    errors: [],
  };

  const gmail = getGmailClientForBounceSync();
  const processed = await loadProcessedMessageIds();
  const maxMessages = Math.min(Math.max(params?.maxMessages ?? 25, 1), 50);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: 'from:(mailer-daemon@googlemail.com OR "Mail Delivery Subsystem") newer_than:30d',
    maxResults: maxMessages,
  });

  const messageIds = (listRes.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));

  for (const messageId of messageIds) {
    if (processed.has(messageId)) {
      result.skippedAlreadyProcessed += 1;
      continue;
    }

    result.scanned += 1;

    try {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const headers = msg.data.payload?.headers ?? [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";

      if (!isLikelyDeliveryFailureSubject(subject)) {
        processed.add(messageId);
        continue;
      }

      const text = collectTextFromPayload(msg.data.payload ?? {});
      const snippet = msg.data.snippet || "";
      const failedEmail = parseFailedRecipientFromBounce(
        `${text}\n${snippet}`,
      );

      if (!failedEmail) {
        processed.add(messageId);
        continue;
      }

      result.matched += 1;
      const docs = await findSentVoucherDocsByEmail(failedEmail);
      if (!docs.length) {
        processed.add(messageId);
        continue;
      }

      const errorText = humanizeEmailDeliveryError(
        `Gmail reported delivery failure for ${failedEmail}.`,
      );

      for (const doc of docs) {
        await markLoyaltyVoucherDeliveryBounced(doc.id, {
          emailError: errorText,
          emailProvider: "smtp",
        });
        result.updated += 1;
        console.log(
          `${LOG} marked failed order ${doc.id} — bounce for ${failedEmail}`,
        );
      }

      processed.add(messageId);

      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LOG} message ${messageId} failed`, err);
      result.errors.push(message);
    }
  }

  await saveProcessedMessageIds(processed);
  return result;
}
