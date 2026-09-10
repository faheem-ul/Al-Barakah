import "server-only";

type FirebaseLookupResponse = {
  users?: Array<{ localId: string }>;
  error?: { message?: string };
};

/**
 * Verify a Firebase ID token via the Identity Toolkit REST API.
 * Avoids firebase-admin/auth + jwks-rsa, which breaks on Vercel (jose ESM).
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<boolean> {
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
    return false;
  }

  const data = (await response.json()) as FirebaseLookupResponse;
  return Boolean(data.users?.length);
}
