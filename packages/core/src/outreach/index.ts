/**
 * Reading outreach tracking: what a hit on an invite link actually means.
 *
 * The emails are written and sent by hand. Everything here is about what can
 * honestly be concluded afterwards, which is less than it first appears —
 * mail security products fetch every link they are sent, so a raw click count
 * measures scanners as much as pharmacists.
 */

/** Unambiguous in a URL, and nothing here is ever read aloud. */
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LENGTH = 12;

/**
 * A short, unguessable token for an invite link.
 *
 * Twelve characters of this alphabet is about 70 bits — far past guessing —
 * while staying short enough that `/i/aB3kD9xQ2mZp` reads as a deliberate
 * short link rather than as tracking machinery.
 *
 * Bytes are rejected above the largest whole multiple of the alphabet size so
 * the early letters are not very slightly more likely than the late ones.
 */
export function generateOutreachToken(length: number = TOKEN_LENGTH): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length - out.length + 8);
    globalThis.crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (out.length === length) break;
      if (b >= limit) continue;
      out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

/**
 * How long after a send a hit is assumed to be a machine rather than a person.
 *
 * A mail gateway checks the links in a message as it is delivered. A person
 * reads the message, thinks about it, and clicks — never inside a minute of
 * the send, because they have not seen it yet.
 */
export const BOT_WINDOW_MS = 60_000;

/**
 * Fragments that appear in the user agent of things that fetch links without
 * a human behind them. Matched case-insensitively against the whole string.
 */
const BOT_AGENTS = [
  "bot", "crawler", "spider", "slurp", "preview", "scan", "fetcher", "monitor",
  "proofpoint", "barracuda", "mimecast", "symantec", "forcepoint", "trendmicro",
  "safelinks", "bingpreview", "skypeuripreview", "python-requests", "curl", "wget",
  "headlesschrome", "phantomjs",
];

/**
 * Whether a hit looks like a machine.
 *
 * Deliberately errs towards calling things bots. An invite wrongly marked
 * unread costs a follow-up email that was probably worth sending anyway; an
 * invite wrongly marked read is a pharmacy quietly dropped from the list.
 */
export function isLikelyBot({
  sentAt,
  at,
  userAgent,
}: {
  /** When the email was sent, if it has been marked sent. */
  sentAt: Date | string | null | undefined;
  at: Date;
  userAgent: string | null | undefined;
}): boolean {
  const agent = (userAgent ?? "").toLowerCase();
  // A browser always identifies itself. Something that does not is not one.
  if (!agent.trim()) return true;
  if (BOT_AGENTS.some((fragment) => agent.includes(fragment))) return true;

  if (sentAt) {
    const sent = new Date(sentAt);
    if (!Number.isNaN(sent.getTime())) {
      const delta = at.getTime() - sent.getTime();
      // Only the window just after the send. A hit recorded before the send
      // time means the send was marked late by hand, which says nothing.
      if (delta >= 0 && delta < BOT_WINDOW_MS) return true;
    }
  }
  return false;
}

export type Visit = { created_at: string; likely_bot: boolean; kind?: string; path?: string | null };

export type VisitSummary = {
  /** Human hits per destination keyword, so the table can say which pulled. */
  byDestination: Record<string, number>;
  /** Hits that survived the bot filter. */
  human: number;
  /** Hits that did not. Shown so the filter can be seen working. */
  bot: number;
  /**
   * Separate days with at least one human hit. The honest headline: a scanner
   * hits once on delivery, a pharmacist who is thinking about it comes back.
   */
  days: number;
  firstHuman: Date | null;
  lastHuman: Date | null;
};

export function summariseVisits(visits: Visit[]): VisitSummary {
  const days = new Set<string>();
  const byDestination: Record<string, number> = {};
  let human = 0;
  let bot = 0;
  let first: Date | null = null;
  let last: Date | null = null;

  for (const v of visits) {
    if (v.likely_bot) {
      bot += 1;
      continue;
    }
    const at = new Date(v.created_at);
    if (Number.isNaN(at.getTime())) continue;
    human += 1;
    days.add(at.toISOString().slice(0, 10));
    const where = v.path?.trim();
    if (where) byDestination[where] = (byDestination[where] ?? 0) + 1;
    if (!first || at < first) first = at;
    if (!last || at > last) last = at;
  }

  return { human, bot, days: days.size, byDestination, firstHuman: first, lastHuman: last };
}

/** Where a contact has got to. Ordered: each stage implies the ones before it. */
export const OUTREACH_STAGES = ["new", "sent", "visited", "signed_up", "submitted", "approved"] as const;
export type OutreachStage = (typeof OUTREACH_STAGES)[number];

export type StageInput = {
  sentAt: string | null;
  humanVisits: number;
  /** Set once a signup carried the token, or once an admin linked the row. */
  pharmacy: { status: string; submitted_at: string | null } | null;
};

/**
 * Works out the stage from facts, never from a field someone maintains.
 *
 * Everything from `signed_up` upwards reads off the linked pharmacy row, so it
 * keeps up on its own as that pharmacy submits and gets approved. There used
 * to be a tick-box saying "signed up, but I cannot point at the account",
 * which meant the table could show a stage nothing backed up; linking the
 * pharmacy says the same thing and stays true afterwards.
 */
export function outreachStage({ sentAt, humanVisits, pharmacy }: StageInput): OutreachStage {
  if (pharmacy) {
    if (pharmacy.status === "approved") return "approved";
    if (pharmacy.submitted_at) return "submitted";
    return "signed_up";
  }
  if (humanVisits > 0) return "visited";
  if (sentAt) return "sent";
  return "new";
}

export const STAGE_LABELS: Record<OutreachStage, string> = {
  new: "Not sent",
  sent: "Sent",
  visited: "Opened the link",
  signed_up: "Signed up",
  submitted: "Profile submitted",
  approved: "Approved",
};

/**
 * A rule for where one invite-link suffix sends people.
 *
 * `/i/<token>` follows the rule slugged `""`, `/i/<token>/signup` the one
 * slugged `signup`. A rule that appends takes whatever follows its slug and
 * puts it on the end, which is how one `rates` rule covers every rate card
 * that will ever exist.
 *
 * `site` is a choice between two known apps, never a host. A rule that could
 * name its own origin would make every invite link an open redirect on a
 * domain pharmacies are being asked to trust — and a forwarded pitch email
 * hands a working token to anyone who wants one.
 */
export type LinkRule = {
  slug: string;
  site: "pharmacy" | "patient";
  path: string;
  appends_rest: boolean;
  label: string;
};

export type InviteDestination = {
  /** For the admin list and the stored visit row: short and readable. */
  key: string;
  /** Rooted path, relative to whichever site the rule names. */
  path: string;
  site: "pharmacy" | "patient";
  label: string;
};

const FALLBACK: InviteDestination = { key: "home", path: "/", site: "pharmacy", label: "The pitch" };

/**
 * Whether a stored path is safe to redirect to.
 *
 * Rooted, single-slashed, no traversal, no scheme and no host. The database
 * checks the same shape, and so does the admin form; this is the one that
 * runs immediately before a redirect, where it actually matters.
 */
export function isSafeRulePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://") || path.includes(":")) return false;
  if (path.includes("..")) return false;
  if (path.includes("\\")) return false;
  return true;
}

/**
 * Keeps a segment that came out of somebody's URL from escaping the path.
 *
 * These arrive from whoever clicked, so `..`, a slash or an encoded one would
 * otherwise let a crafted link walk out of the intended page — the difference
 * between a rate card and an open redirect.
 */
function safeSegment(segment: string): string | null {
  const raw = segment.trim();
  if (!raw || raw === "." || raw === "..") return null;
  if (/[\\/]/.test(raw) || raw.includes("%2f") || raw.includes("%2F")) return null;
  return encodeURIComponent(raw);
}

/**
 * Turns the bit after the token into somewhere to send them.
 *
 * Anything unrecognised falls back to the pitch rather than 404ing. A link
 * mangled by a mail client is still a pharmacy who clicked, and landing them
 * on the home page keeps both the visit and the person.
 */
export function resolveInviteDestination(rules: LinkRule[], segments: string[] | undefined): InviteDestination {
  const [first, ...rest] = (segments ?? []).filter((s) => s !== "");
  const slug = first ?? "";
  const rule = rules.find((r) => r.slug === slug);
  if (!rule || !isSafeRulePath(rule.path)) return FALLBACK;

  const base = { site: rule.site, label: rule.label };
  if (!rule.appends_rest || rest.length === 0) {
    return { ...base, key: slug || "home", path: rule.path };
  }

  const extra = rest.map(safeSegment);
  // One bad segment and the whole tail is dropped rather than half-applied:
  // /delivery-rates with no city is a 404, so the pitch is the better answer.
  if (extra.some((s) => s === null)) return FALLBACK;

  const tail = extra.join("/");
  return {
    ...base,
    key: `${slug}/${rest.join("/")}`,
    path: `${rule.path.replace(/\/+$/, "")}/${tail}`,
    label: `${rule.label}: ${rest.join("/")}`,
  };
}

/** Joins a base URL to a path without the double slash a trailing / leaves. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export {
  DEFAULT_TEMPLATE,
  htmlToPlainText,
  outreachPlaceholders,
  outreachSendBlockers,
  renderOutreachEmail,
  type EmailTemplate,
  type Placeholder,
  type RenderedEmail,
  type SendableContact,
  type TemplateContact,
} from "./email";
