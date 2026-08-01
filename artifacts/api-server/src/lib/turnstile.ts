import { logger } from "./logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let warnedMissingSecret = false;

export function warnIfTurnstileDisabled(): void {
  if (process.env.TURNSTILE_SECRET_KEY?.trim()) return;
  if (warnedMissingSecret) return;
  warnedMissingSecret = true;
  logger.warn(
    "Turnstile verification DISABLED — TURNSTILE_SECRET_KEY not set. " +
      "Bot checks are skipped. Set TURNSTILE_SECRET_KEY in production.",
  );
}

function getSecret(): string | null {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  return secret || null;
}

/** Returns true when verification succeeded, or when Turnstile is not configured. */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = getSecret();
  if (!secret) {
    warnIfTurnstileDisabled();
    return true;
  }

  const trimmed = token?.trim();
  if (!trimmed) return false;

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", trimmed);
    if (remoteIp?.trim()) {
      body.set("remoteip", remoteIp.trim());
    }

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "Turnstile siteverify HTTP error");
      return false;
    }

    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    logger.warn({ err }, "Turnstile siteverify request failed");
    return false;
  }
}
