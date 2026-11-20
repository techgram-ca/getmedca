"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactAnalyticsPath } from "@getmed/core/analytics";

/**
 * Vercel Web Analytics for the public site.
 *
 * A client component because `beforeSend` is a function, and a function
 * cannot be handed from a server layout to a client one. That is the only
 * reason this file exists rather than `<Analytics />` in the layout.
 *
 * The package sends the pathname and the route pattern, never the query
 * string — but the query string is where this site keeps the things that
 * must not leave, so it is removed here as well rather than resting on that:
 * /search carries the street address somebody typed and the coordinates it
 * resolved to, and the order and consultation pages carry the id of a real
 * prescription.
 */
export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url, window.location.origin);
        const path = redactAnalyticsPath(url.pathname);
        if (path === null) return null;
        // Rebuilt rather than edited, which drops the fragment with the query.
        return { ...event, url: `${url.origin}${path}` };
      }}
    />
  );
}
