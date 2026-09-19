import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@getmed/db/server";

/**
 * Supabase redirects here after a pharmacy confirms its email address.
 *
 * Supabase sends either a PKCE `code` or a `token_hash` + `type` pair,
 * depending on the project's email template, so both are handled. When the
 * session is established the pharmacy continues straight into setup; when it
 * cannot be (for example the link was opened in a different browser, so the
 * PKCE verifier cookie is missing) they are sent to sign in instead of being
 * dropped on the marketing page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const errorDescription = url.searchParams.get("error_description");
  const nextParam = url.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/signup";

  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (errorDescription) {
    return to(`/login?error=${encodeURIComponent(errorDescription)}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return to(next);
    // Link is valid but this browser can't complete the exchange.
    return to("/login?confirmed=1");
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return to(next);
    return to(`/login?error=${encodeURIComponent("That confirmation link has expired. Sign in, or sign up again to get a new one.")}`);
  }

  // No recognisable parameters — send them somewhere useful rather than home.
  return to("/login");
}
