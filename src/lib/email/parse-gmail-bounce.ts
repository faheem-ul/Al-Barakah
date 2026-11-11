const EMAIL_IN_TEXT =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;

/**
 * Extract the failed recipient from a Google / Gmail DSN bounce message.
 */
export function parseFailedRecipientFromBounce(text: string): string | null {
  const body = text.replace(/\r\n/g, "\n");

  const googleQuoted =
    /wasn't delivered to\s+([^\s\n]+@[^\s\n]+)/i.exec(body) ||
    /was not delivered to\s+([^\s\n]+@[^\s\n]+)/i.exec(body);
  if (googleQuoted?.[1]) {
    return normalizeBounceEmail(googleQuoted[1]);
  }

  const finalRecipient =
    /final-recipient:\s*rfc822;\s*([^\s\n]+)/i.exec(body) ||
    /original-recipient:\s*rfc822;\s*([^\s\n]+)/i.exec(body);
  if (finalRecipient?.[1]) {
    return normalizeBounceEmail(finalRecipient[1]);
  }

  const diagnostic =
    /(?:550|551|553|554)[^\n]*[<\s]([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i.exec(
      body,
    );
  if (diagnostic?.[1]) {
    return normalizeBounceEmail(diagnostic[1]);
  }

  return null;
}

function normalizeBounceEmail(raw: string): string | null {
  const cleaned = raw.replace(/^[<"']+|[>"']+$/g, "").trim().toLowerCase();
  if (!cleaned.includes("@")) return null;
  return cleaned;
}

export function isLikelyDeliveryFailureSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return (
    s.includes("delivery status notification") ||
    s.includes("mail delivery failed") ||
    s.includes("undelivered mail") ||
    s.includes("address not found") ||
    s.includes("failure notice")
  );
}

export function extractEmailsForDebug(text: string): string[] {
  const matches = text.match(EMAIL_IN_TEXT) ?? [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}
