/**
 * Plain-language delivery errors for admin UI / Firestore.
 */
export function humanizeEmailDeliveryError(raw: string): string {
  const message = raw.trim();
  if (!message) return "Email could not be delivered.";

  const lower = message.toLowerCase();

  if (
    lower.includes("address not found") ||
    lower.includes("user unknown") ||
    lower.includes("does not exist") ||
    lower.includes("no such user") ||
    lower.includes("550") ||
    lower.includes("551") ||
    lower.includes("553") ||
    lower.includes("recipient rejected") ||
    lower.includes("rejected recipient")
  ) {
    return "Invalid or undeliverable email address. The customer mailbox was not found or rejected delivery.";
  }

  if (lower.includes("mailbox full") || lower.includes("452")) {
    return "Customer mailbox is full. Try again later or use another email.";
  }

  if (lower.includes("spam") || lower.includes("blocked")) {
    return "Message was blocked by the recipient mail provider.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return "Invalid email address. Check for typos and try again.";
  }

  return message.length > 240 ? `${message.slice(0, 240)}…` : message;
}
