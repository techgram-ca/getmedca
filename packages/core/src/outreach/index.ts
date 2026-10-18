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
  /** The weaker claim, for a pharmacy that signed up before any of this existed. */
  manualSignedUpAt: string | null;
};

export type StageResult = {
  stage: OutreachStage;
  /**
   * Whether reaching `signed_up` or beyond rests on a linked pharmacy row
   * rather than on somebody having ticked a box. The admin list says which,
   * because a table that cannot tell them apart is a table that lies.
   */
  confirmed: boolean;
};

/**
 * Works out the stage from facts, never from a field someone maintains.
 *
 * Everything from `signed_up` upwards comes from the pharmacy row itself, so
 * it keeps up on its own as that pharmacy submits and gets approved. The only
 * thing a human sets is the fallback for an account that cannot be pointed at.
 */
export function outreachStage({ sentAt, humanVisits, pharmacy, manualSignedUpAt }: StageInput): StageResult {
  if (pharmacy) {
    if (pharmacy.status === "approved") return { stage: "approved", confirmed: true };
    if (pharmacy.submitted_at) return { stage: "submitted", confirmed: true };
    return { stage: "signed_up", confirmed: true };
  }
  if (manualSignedUpAt) return { stage: "signed_up", confirmed: false };
  if (humanVisits > 0) return { stage: "visited", confirmed: false };
  if (sentAt) return { stage: "sent", confirmed: false };
  return { stage: "new", confirmed: false };
}

export const STAGE_LABELS: Record<OutreachStage, string> = {
  new: "Not sent",
  sent: "Sent",
  visited: "Opened the link",
  signed_up: "Signed up",
  submitted: "Profile submitted",
  approved: "Approved",
};

export const OUTCOMES = ["new", "contacted", "replied", "not_interested"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_LABELS: Record<Outcome, string> = {
  new: "—",
  contacted: "Contacted",
  replied: "Replied",
  not_interested: "Not interested",
};

/**
 * What an invite link's suffix means.
 *
 * `/i/<token>` goes to the pitch; `/i/<token>/signup` to the form;
 * `/i/<token>/rates/bolton` to that rate card; `/i/<token>/demo` to the demo
 * page on the patient site. Several of them can go in one email, and which
 * one gets opened says more than whether anything did — a pharmacy that reads
 * the pricing twice and never opens the form is telling you what to write
 * next.
 *
 * The suffix is a keyword, not a path. A page can move without breaking a
 * link that is already sitting in somebody's inbox.
 */
export type InviteDestination = {
  /** For the admin list and the stored visit row: short and readable. */
  key: string;
  /** Relative to the pharmacy app, unless `patient` says otherwise. */
  path: string;
  /** Lives on the patient site, so it needs that app's origin. */
  patient?: boolean;
  label: string;
};

export const INVITE_LINKS = [
  { suffix: "", key: "home", label: "The pitch (pharmacy home)" },
  { suffix: "signup", key: "signup", label: "Sign-up form" },
  { suffix: "demo", key: "demo", label: "Demo pharmacy page" },
  { suffix: "rates/<city>", key: "rates", label: "A delivery rate card" },
] as const;

/**
 * Turns the bit after the token into somewhere to send them.
 *
 * Anything unrecognised falls back to the pitch rather than 404ing. A link
 * mangled by a mail client is still a pharmacy who clicked, and landing them
 * on the home page keeps both the visit and the person.
 */
export function resolveInviteDestination(segments: string[] | undefined): InviteDestination {
  const [first, ...rest] = segments ?? [];
  switch (first) {
    case undefined:
    case "":
      return { key: "home", path: "/", label: "The pitch" };
    case "signup":
      return { key: "signup", path: "/signup", label: "Sign-up form" };
    case "demo":
      return { key: "demo", path: "/p/demo-pharmacy", patient: true, label: "Demo pharmacy page" };
    case "rates": {
      const city = rest[0]?.trim();
      // No city named: the rate cards have no index, so the pitch is better
      // than a 404 on a link somebody has already been sent.
      if (!city) return { key: "home", path: "/", label: "The pitch" };
      return { key: `rates/${city}`, path: `/delivery-rates/${encodeURIComponent(city)}`, label: `Rate card: ${city}` };
    }
    default:
      return { key: "home", path: "/", label: "The pitch" };
  }
}

/** Joins a base URL to a path without the double slash a trailing / leaves. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
