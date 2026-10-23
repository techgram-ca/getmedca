import { slugify } from "../format";
import { joinUrl, type LinkRule } from "./index";

/**
 * Turning one stored template into the email for one pharmacy.
 *
 * The emails are written and sent by hand from a real mailbox, so nothing here
 * sends anything. What it does is stop the same HTML being retyped twelve
 * times with a different name and a different token each time, which is where
 * the wrong token ends up in the wrong pharmacy's email.
 *
 * Links are placeholders in their finished form — `[signup-link]`, not a token
 * to paste into a URL the template author has to remember. Two reasons. The
 * origin never gets written into a template, so the same template works
 * against production and a QA domain; and the set of link placeholders is
 * derived from the link rules, so adding a destination in the admin UI gives
 * every template a new placeholder without anyone editing anything.
 */

export type EmailTemplate = { subject: string; body: string };

export type TemplateContact = {
  pharmacy_name: string;
  city: string | null;
  token: string;
  contact_email?: string | null;
};

export type Placeholder = {
  /** Written in a template exactly like this, brackets included. */
  key: string;
  label: string;
  /** What it resolves to for whichever contact is being previewed. */
  example: string;
};

/** The ones that are not links. */
const FIELD_KEYS = ["pharmacy-name", "pharmacy-city", "pharmacy-city-caps", "pharmacy-token"] as const;

/**
 * A city as it should read in a sentence.
 *
 * Cities are typed into the contact form by hand, so they arrive as "bolton",
 * "BOLTON" and "Richmond hill" as often as not, and a pitch email that opens
 * "pharmacies in bolton" looks automated in exactly the way these are trying
 * not to.
 */
function titleCaseCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

/** `[anything-here]`, so a misspelt placeholder can be spotted rather than sent. */
const PLACEHOLDER_PATTERN = /\[([a-z0-9][a-z0-9-]*)\]/gi;

/**
 * Every placeholder available for a contact, in the order a template is likely
 * to want them.
 *
 * A link rule that appends (the rate card, which needs a city) is only offered
 * when this contact has a city to put on the end. Offering it anyway would
 * produce `/delivery-rates/` — a 404 in an email to a real pharmacy.
 */
export function outreachPlaceholders(
  contact: TemplateContact,
  rules: LinkRule[],
  pharmacyUrl: string,
): Placeholder[] {
  const city = contact.city?.trim() ?? "";
  const out: Placeholder[] = [
    { key: "[pharmacy-name]", label: "Pharmacy name", example: contact.pharmacy_name },
    // Two forms of the same city, because the two uses want different ones.
    // The slug is what survives being put in a URL by hand — "Richmond Hill"
    // in a path is a broken link, "richmond-hill" is the rate card.
    { key: "[pharmacy-city-caps]", label: "City, for a sentence", example: titleCaseCity(city) },
    { key: "[pharmacy-city]", label: "City, for a link", example: slugify(city) },
    { key: "[pitch-link]", label: "Pitch link", example: joinUrl(pharmacyUrl, `i/${contact.token}`) },
  ];

  for (const rule of rules) {
    if (rule.slug === "") continue; // that one is [pitch-link], already above
    if (rule.appends_rest && !contact.city?.trim()) continue;
    const tail = rule.appends_rest ? `${rule.slug}/${slugify(contact.city ?? "")}` : rule.slug;
    out.push({
      key: `[${rule.slug}-link]`,
      label: rule.label,
      example: joinUrl(pharmacyUrl, `i/${contact.token}/${tail}`),
    });
  }

  out.push(
    { key: "[unsubscribe-link]", label: "Unsubscribe link", example: joinUrl(pharmacyUrl, `u/${contact.token}`) },
    { key: "[pharmacy-token]", label: "Raw token", example: contact.token },
  );
  return out;
}

export type RenderedEmail = {
  subject: string;
  html: string;
  /**
   * Placeholders the template used that could not be filled: a typo, or a
   * rate-card link on a contact with no city. Named rather than left in the
   * output silently, because the output goes to a real pharmacy.
   */
  unknown: string[];
  /** Which known placeholders were actually used, for the "it worked" case. */
  used: string[];
};

/**
 * Substitutes a template for one contact.
 *
 * An unrecognised placeholder is left in the text exactly as written rather
 * than blanked. A gap where a name should be reads as a sloppy mail merge and
 * gets ignored; `[pharmcy-name]` sitting in the preview gets noticed and
 * fixed.
 */
export function renderOutreachEmail(
  template: EmailTemplate,
  contact: TemplateContact,
  rules: LinkRule[],
  pharmacyUrl: string,
): RenderedEmail {
  const table = new Map(outreachPlaceholders(contact, rules, pharmacyUrl).map((p) => [p.key.toLowerCase(), p.example]));
  const unknown = new Set<string>();
  const used = new Set<string>();

  const substitute = (text: string) =>
    text.replace(PLACEHOLDER_PATTERN, (match) => {
      const key = match.toLowerCase();
      const value = table.get(key);
      if (value === undefined) {
        // Only complain about things shaped like one of ours. A template is
        // allowed to contain "[see below]" without being told off for it.
        if (looksLikePlaceholder(key)) unknown.add(match);
        return match;
      }
      used.add(match);
      return value;
    });

  return {
    subject: substitute(template.subject),
    html: substitute(template.body),
    unknown: [...unknown],
    used: [...used],
  };
}

/**
 * Whether `[something]` was meant to be a placeholder.
 *
 * Every placeholder is hyphenated, and bracketed prose almost never is, so a
 * hyphen is the test. It catches the ones that matter — `[rate-link]` for
 * `[rates-link]`, `[pharmcy-name]` for `[pharmacy-name]` — while leaving
 * `[1]`, `[TBC]` and `[see below]` alone. Matching against the known keys
 * instead would miss exactly the typos this exists to find.
 */
function looksLikePlaceholder(key: string): boolean {
  const inner = key.slice(1, -1);
  return FIELD_KEYS.some((f) => f === inner) || inner.includes("-");
}

/**
 * The template a fresh database starts with.
 *
 * Deliberately plain HTML: it is pasted into a mail client, and anything a
 * mail client has to reinterpret is a thing it can get wrong. Inline styles
 * only, no stylesheet, no external image.
 */
export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: "Delivery for [pharmacy-name], run by GetMed",
  body: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a2b32;max-width:560px">
  <p>Hello,</p>

  <p>
    I am getting in touch about <strong>[pharmacy-name]</strong>. GetMed gives
    pharmacies in [pharmacy-city-caps] prescription delivery without hiring a driver
    or signing up to a gig app &mdash; our own team runs every delivery, and you
    pay a flat fee per delivered order.
  </p>

  <p>
    A few things you might want to look at before replying:
  </p>

  <ul style="padding-left:18px">
    <li><a href="[pitch-link]">How it works</a></li>
    <li><a href="[rates-link]">What delivery costs in [pharmacy-city-caps]</a></li>
    <li><a href="[demo-link]">A sample pharmacy page</a>, which is what your own would look like</li>
  </ul>

  <p>
    If it looks useful, you can <a href="[signup-link]">create an account here</a>.
    It takes a few minutes and nothing goes live until you have approved it.
  </p>

  <p>Happy to answer anything by reply.</p>

  <p style="color:#5b6b73;font-size:13px;margin-top:28px">
    If you would rather not hear from us again,
    <a href="[unsubscribe-link]" style="color:#5b6b73">let us know here</a>.
  </p>
</div>`,
};

// ---------------------------------------------------------------------
// Sending
//
// Everything above this line produces text for a person to paste. Below it,
// the app sends on its own, and the checks get stricter: a preview has a
// human looking at it who will notice a stray `[rates-link]`, and a bulk send
// does not.
// ---------------------------------------------------------------------

export type SendableContact = TemplateContact & {
  contact_email?: string | null;
  unsubscribed_at?: string | null;
};

/**
 * Why this contact must not be sent to, if anything.
 *
 * Returns reasons rather than a boolean so a bulk send can say which pharmacy
 * it skipped and why, instead of reporting "3 of 12 failed".
 */
export function outreachSendBlockers(
  contact: SendableContact,
  template: EmailTemplate,
  rendered: RenderedEmail,
): string[] {
  const reasons: string[] = [];
  if (!contact.contact_email?.trim()) reasons.push("no email address on file");
  if (contact.unsubscribed_at) reasons.push("they asked not to be contacted");
  if (!rendered.subject.trim()) reasons.push("the template has no subject line");
  if (!rendered.html.trim()) reasons.push("the template has no body");
  if (rendered.unknown.length) {
    reasons.push(`${rendered.unknown.join(", ")} did not resolve`);
  }
  // Canadian anti-spam law wants a working way out of every commercial email,
  // and the unsubscribe token is per-contact, so it cannot be bolted on
  // afterwards. Refusing here is cheaper than a complaint.
  if (!/\[unsubscribe-link\]/i.test(template.body)) {
    reasons.push("the template has no [unsubscribe-link]");
  }
  return reasons;
}

/**
 * A readable plain-text alternative to the HTML body.
 *
 * Not a renderer and not trying to be. Some clients refuse HTML outright and
 * some spam filters mark a message with no text part down, and either way an
 * email whose text part is empty is worse than one that reads a bit flat.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    // A link's destination is the point of these emails, so it survives the
    // tags rather than leaving the text part with bare, unclickable words.
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text && text !== href ? `${text}: ${href}` : href;
    })
    // The opening <li> supplies the break, so the closing one must not: a
    // list would otherwise come out double-spaced.
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
