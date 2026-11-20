/**
 * Keeping a page view from carrying who made it.
 *
 * Vercel Web Analytics reports the path of every page view, and most paths
 * here are the same for everybody — /faq is /faq. A few are not. The
 * unsubscribe page is reached at /u/<token>, where the token *is* the link
 * out of a pitch email; an order, invoice or consultation page is the UUID
 * of one prescription. None of that should be held by a third party, and
 * none of it is what anyone wants out of analytics anyway: the useful figure
 * is how many people reached the order page, not which orders they were.
 *
 * Collapsing rather than dropping, wherever collapsing will do. A page view
 * reported as /orders/[id] still counts, which is the whole point of
 * measuring; it just no longer says whose.
 */

/** A path whose own segments identify someone, and what to send instead. */
export type PathRedaction = {
  /** The path, or the part of it that comes before the telling segments. */
  prefix: string;
  /** Reported in its place. Null drops the page view altogether. */
  as: string | null;
};

/**
 * A UUID is unmistakable, so collapsing one costs no real path — nothing a
 * person types or links to looks like this. Every id the two sites put in a
 * path is one, which is why no app needs a rule of its own for them.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What may be reported for a path, or null if nothing may be.
 *
 * Redactions are tried in order and the first that matches wins, so a site
 * can name an exact page ahead of the prefix that contains it.
 */
export function redactAnalyticsPath(pathname: string, redactions: PathRedaction[] = []): string | null {
  // "/orders/" and "/orders" are one page, and only one of them would match
  // a prefix written the obvious way.
  const path = pathname.replace(/\/+$/, "") || "/";

  for (const rule of redactions) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) return rule.as;
  }

  return path.split("/").map((segment) => (UUID.test(segment) ? "[id]" : segment)).join("/") || "/";
}
