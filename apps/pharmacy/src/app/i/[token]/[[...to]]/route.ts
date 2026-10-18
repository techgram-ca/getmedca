import { NextResponse, type NextRequest } from "next/server";
import { isLikelyBot, joinUrl, resolveInviteDestination } from "@getmed/core/outreach";
import { createServiceClient } from "@getmed/db/service";

/** How long the attribution cookie outlives the click. */
const COOKIE_DAYS = 90;
export const REFERRAL_COOKIE = "gm_invite";

/**
 * An invite link from a pitch email.
 *
 * `/i/<token>` goes to the pitch, and a suffix picks somewhere else —
 * `/signup`, `/demo`, `/rates/<city>`. Several can go in one email under the
 * same token, so what gets recorded is not only that somebody clicked but
 * which of the things on offer they went for.
 *
 * The token is spent here and never reaches the destination page, so it cannot
 * leak out through a `Referer` header to Mapbox or Google Fonts, and there is
 * nothing to strip from the address bar afterwards.
 *
 * It identifies a prospect and nothing more. Emails get forwarded, so this
 * must never be allowed to grant anything — no session, no account, no access.
 * The most it ever does is write a row and set a cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; to?: string[] }> },
) {
  const { token, to } = await params;
  const origin = request.nextUrl.origin;
  const destination = resolveInviteDestination(to);

  const db = createServiceClient();
  const { data: contact } = await db
    .from("outreach_contacts")
    .select("id, sent_at")
    .eq("token", token)
    .maybeSingle();

  // An unknown token goes to the pitch rather than a 404. Someone mangled a
  // link out of an email; the front page is better than an error.
  if (!contact) return NextResponse.redirect(new URL("/", origin));

  const userAgent = request.headers.get("user-agent");
  await db.from("outreach_visits").insert({
    contact_id: contact.id,
    kind: "visit",
    // The keyword, not the resolved URL: it is what the admin list reads back,
    // and it stays meaningful if a page ever moves.
    path: destination.key,
    user_agent: userAgent,
    // x-forwarded-for is a list; the client is the first entry.
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    likely_bot: isLikelyBot({ sentAt: contact.sent_at, at: new Date(), userAgent }),
  });

  // The demo page is the one destination on the patient site. Sending it to
  // this app's origin instead lands on a path the proxy does not know, and
  // bounces the pharmacy to a login form it has no account for.
  const base = destination.patient ? (process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca") : origin;
  const target = joinUrl(base, destination.path);

  const response = NextResponse.redirect(target);
  // Set before the redirect, so it belongs to this app even when the
  // destination is on another domain. Signup happens back here, which is
  // where it gets read.
  response.cookies.set(REFERRAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_DAYS * 24 * 60 * 60,
  });
  return response;
}
