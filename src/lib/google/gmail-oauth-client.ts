import "server-only";

import { google } from "googleapis";

const LOG = "[Gmail OAuth]";

export function isGmailBounceSyncConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_OAUTH_CLIENT_ID?.trim() &&
      process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim(),
  );
}

export function getGmailClientForBounceSync() {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail bounce sync is not configured. Set GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, and GMAIL_OAUTH_REFRESH_TOKEN.",
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  console.log(`${LOG} Using OAuth refresh token for bounce inbox read`);
  return google.gmail({ version: "v1", auth: oauth2 });
}
