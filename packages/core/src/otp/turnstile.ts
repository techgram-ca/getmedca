/** Verify a Cloudflare Turnstile token. Required on every OTP-send endpoint. */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Allow local development without Turnstile; production must configure it.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  const json = (await res.json()) as { success: boolean };
  return json.success === true;
}
