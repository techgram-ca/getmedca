import { NextResponse, type NextRequest } from "next/server";
import { isLikelyBot } from "@getmed/core/outreach";
import { createServiceClient } from "@getmed/db/service";

/** How long the attribution cookie outlives the click. */
const COOKIE_DAYS = 90;
export const REFERRAL_COOKIE = "gm_invite";

/**
 * An invite link from a pitch email.
 *
 * Records the hit, remembers who it was, and sends them on. The token is spent
 * here and never reaches the destination page, so it cannot leak out through a
 * `Referer` header to Mapbox or Google Fonts, and there is nothing to strip
 * from the address bar afterwards.
 *
 * It identifies a prospect and nothing more. Emails get forwarded, so this
 * must never be allowed to grant anything — no session, no account, no access.
 * The most it ever does is write a row and set a cookie.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = request.nextUrl.origin;

  const db = createServiceClient();
  const { data: contact } = await db
    .from("outreach_contacts")
    .select("id, destination_path, sent_at")
    .eq("token", token)
    .maybeSingle();

  // An unknown token goes to the front page rather than a 404. Someone mangled
  // a link out of an email; sending them to the pitch is better than an error.
  if (!contact) return NextResponse.redirect(new URL("/", origin));

  const userAgent = request.headers.get("user-agent");
  await db.from("outreach_visits").insert({
    contact_id: contact.id,
    kind: "visit",
    path: contact.destination_path,
    user_agent: userAgent,
    // x-forwarded-for is a list; the client is the first entry.
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    likely_bot: isLikelyBot({ sentAt: contact.sent_at, at: new Date(), userAgent }),
  });

  // An absolute destination (the demo page lives on the patient site) is used
  // as given; anything else is resolved against this app.
  const target = /^https?:\/\//.test(contact.destination_path)
    ? contact.destination_path
    : new URL(contact.destination_path, origin).toString();

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
