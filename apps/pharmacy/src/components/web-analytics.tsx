"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactAnalyticsPath, type PathRedaction } from "@getmed/core/analytics";

/**
 * Vercel Web Analytics for the pharmacy site.
 *
 * A client component because `beforeSend` is a function, and a function
 * cannot be handed from a server layout to a client one.
 *
 * Most of this site is behind a login, where a path is a UUID belonging to
 * one order, invoice or consultation; those are collapsed to the shape of
 * the page, which is the figure worth having anyway. The exception is the
 * one page here that anybody can reach.
 */
const REDACTIONS: PathRedaction[] = [
  // /u/<token> is the unsubscribe link out of a pitch email, and the token
  // is the whole of its authority: whoever holds it can unsubscribe that
  // pharmacy. The count of people who opened the page is worth keeping; the
  // links are not ours to hand out.
  { prefix: "/u", as: "/u/[token]" },
];

export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url, window.location.origin);
        const path = redactAnalyticsPath(url.pathname, REDACTIONS);
        if (path === null) return null;
        // Rebuilt rather than edited, which drops the query and the fragment.
        return { ...event, url: `${url.origin}${path}` };
      }}
    />
  );
}
