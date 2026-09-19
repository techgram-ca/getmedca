/**
 * Cloudflare Turnstile bot check for the OTP-send endpoints.
 *
 * The check runs only when BOTH keys are present: the widget cannot produce a
 * token without the public site key, so demanding one with only the secret set
 * would reject every legitimate submission. When it is not configured the
 * endpoints still rely on the per-phone and per-IP rate limits.
 */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

let warned = false;

export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      console.warn(
        "[turnstile] Bot protection is OFF: set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to enable it. Rate limits still apply.",
      );
    }
    return true;
  }
  if (!token) return false;

  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    if (!res.ok) return false;
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch (err) {
    console.error("[turnstile] verification request failed", err instanceof Error ? err.message : err);
    return false;
  }
}
