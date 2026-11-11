const BASIC_EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function validateRecipientEmail(
  raw: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const email = raw.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Email address is required." };
  }
  if (email.length > 320) {
    return { ok: false, error: "Email address is too long." };
  }
  if (!BASIC_EMAIL.test(email)) {
    return {
      ok: false,
      error: "Email address format is invalid. Check for typos.",
    };
  }
  return { ok: true, email };
}
