import "server-only";

type SocialLogLevel = "info" | "warn" | "error" | "debug";

type SocialLogMeta = Record<string, unknown>;

function isDebugEnabled() {
  return process.env.SOCIAL_DEBUG?.trim() === "true";
}

function formatMeta(meta?: SocialLogMeta) {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export function socialLog(
  level: SocialLogLevel,
  step: string,
  message: string,
  meta?: SocialLogMeta,
) {
  if (level === "debug" && !isDebugEnabled()) return;

  const line = `[social] ${step} ${message}${formatMeta(meta)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug") {
    console.debug(line);
    return;
  }

  console.log(line);
}

export function redactUrlHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}
