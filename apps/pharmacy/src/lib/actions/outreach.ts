"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { isLikelyBot } from "@getmed/core/outreach";
import { createServiceClient } from "@getmed/db/service";
import { REFERRAL_COOKIE } from "@/app/i/[token]/[[...to]]/route";

type R = { ok?: true; error?: string } | null;

const tokenSchema = z.object({ token: z.string().trim().min(6).max(64) });

/**
 * Stops the pitch emails for whoever holds this link.
 *
 * A POST, reached from a button, never from the link itself — see the page
 * for why. Says the same thing whether or not the token matched: by the time
 * someone is here they already hold the link, so there is nothing to protect,
 * and an error would only make them wonder whether it worked.
 */
export async function unsubscribe(_prev: R, fd: FormData): Promise<R> {
  const parsed = tokenSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "That link is not one of ours." };

  const db = createServiceClient();
  const { data: contact } = await db
    .from("outreach_contacts")
    .select("id, unsubscribed_at")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!contact) return { ok: true };

  if (!contact.unsubscribed_at) {
    await db.from("outreach_contacts").update({ unsubscribed_at: new Date().toISOString() }).eq("id", contact.id);
    const h = await headers();
    await db.from("outreach_visits").insert({
      contact_id: contact.id,
      kind: "unsubscribe",
      user_agent: h.get("user-agent"),
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      likely_bot: false,
    });
  }
  return { ok: true };
}

/**
 * Attaches a new pharmacy to the invite that brought it, if there was one.
 *
 * Called from signup, where the cookie dropped by /i/<token> is finally read.
 * The click and the signup are rarely the same page view — a pharmacy looks at
 * the rate card, thinks about it, and comes back on Thursday — which is the
 * whole reason the token is kept in a cookie rather than carried in the URL.
 *
 * Everything here is best-effort. Outreach bookkeeping must never be able to
 * stop somebody signing up, so a failure is swallowed rather than surfaced.
 */
export async function linkSignupToInvite(pharmacyId: string): Promise<void> {
  try {
    const jar = await cookies();
    const token = jar.get(REFERRAL_COOKIE)?.value;
    if (!token) return;

    const db = createServiceClient();
    const { data: contact } = await db
      .from("outreach_contacts")
      .select("id, pharmacy_id, sent_at")
      .eq("token", token)
      .maybeSingle();
    if (!contact) return;

    // First invite to reach a signup keeps it. Re-pointing an attribution
    // later would quietly rewrite history for whoever is reading the numbers.
    if (!contact.pharmacy_id) {
      await db.from("outreach_contacts").update({ pharmacy_id: pharmacyId }).eq("id", contact.id);
    }

    const h = await headers();
    const userAgent = h.get("user-agent");
    await db.from("outreach_visits").insert({
      contact_id: contact.id,
      kind: "signup",
      path: "/signup",
      user_agent: userAgent,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      likely_bot: isLikelyBot({ sentAt: contact.sent_at, at: new Date(), userAgent }),
    });
  } catch {
    // Deliberately silent.
  }
}
