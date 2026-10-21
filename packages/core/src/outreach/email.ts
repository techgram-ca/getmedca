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

/** The three that are not links. */
const FIELD_KEYS = ["pharmacy-name", "pharmacy-city", "pharmacy-token"] as const;

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
  const out: Placeholder[] = [
    { key: "[pharmacy-name]", label: "Pharmacy name", example: contact.pharmacy_name },
    { key: "[pharmacy-city]", label: "City", example: contact.city ?? "" },
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
    pharmacies in [pharmacy-city] prescription delivery without hiring a driver
    or signing up to a gig app &mdash; our own team runs every delivery, and you
    pay a flat fee per delivered order.
  </p>

  <p>
    A few things you might want to look at before replying:
  </p>

  <ul style="padding-left:18px">
    <li><a href="[pitch-link]">How it works</a></li>
    <li><a href="[rates-link]">What delivery costs in [pharmacy-city]</a></li>
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
