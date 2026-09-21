import "server-only";

export type VerifiedAdmin = {
  uid: string;
  email: string | null;
};

type FirebaseLookupResponse = {
  users?: Array<{ localId?: string; email?: string }>;
  error?: { message?: string };
};

/**
 * Verify a Firebase ID token via the Identity Toolkit REST API.
 * Avoids firebase-admin/auth + jwks-rsa, which breaks on Vercel (jose ESM).
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedAdmin | null> {
  const apiKey = process.env.NEXT_PUBLIC_apiKey?.trim();
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_apiKey for token verification");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as FirebaseLookupResponse;
  const user = data.users?.[0];
  if (!user) return null;

  const uid = user.localId?.trim();
  if (!uid) return null;

  return {
    uid,
    email: user.email?.trim() || null,
  };
}
