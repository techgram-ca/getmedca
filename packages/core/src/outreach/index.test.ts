import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  BOT_WINDOW_MS,
  generateOutreachToken,
  isLikelyBot,
  joinUrl,
  outreachStage,
  isSafeRulePath,
  resolveInviteDestination,
  summariseVisits,
} from "./index.ts";

// ---------------- generateOutreachToken ----------------

test("a token is short, and short enough to read as a link", () => {
  assert.equal(generateOutreachToken().length, 12);
  assert.equal(generateOutreachToken(8).length, 8);
});

test("a token has nothing in it that can be misread", () => {
  // No 0/O, no 1/l/I: these get read off a screen and typed by hand sometimes.
  const token = generateOutreachToken(400);
  assert.match(token, /^[a-zA-Z2-9]+$/);
  assert.equal(/[01lIO]/.test(token), false);
});

test("tokens do not repeat", () => {
  const seen = new Set(Array.from({ length: 2000 }, () => generateOutreachToken()));
  assert.equal(seen.size, 2000);
});

// ---------------- isLikelyBot ----------------

const SENT = "2026-10-18T09:00:00Z";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36";

test("a hit inside the minute after sending is the mail gateway, not a person", () => {
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-18T09:00:03Z"), userAgent: BROWSER }), true);
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-18T09:00:59Z"), userAgent: BROWSER }), true);
});

test("the window is a minute, and it ends", () => {
  assert.equal(BOT_WINDOW_MS, 60_000);
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-18T09:01:00Z"), userAgent: BROWSER }), false);
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-18T14:00:00Z"), userAgent: BROWSER }), false);
});

test("a scanner is caught by what it calls itself, whenever it arrives", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Barracuda Sentinel)",
    "Microsoft Office Existence Discovery SafeLinks",
    "Mimecast-Link-Scanner/1.0",
    "python-requests/2.31.0",
    "curl/8.4.0",
    "Mozilla/5.0 (X11) HeadlessChrome/131",
    "BingPreview/1.0b",
  ]) {
    assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-19T11:00:00Z"), userAgent: ua }), true, ua);
  }
});

test("no user agent at all is not a browser", () => {
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-19T11:00:00Z"), userAgent: "" }), true);
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-19T11:00:00Z"), userAgent: null }), true);
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-19T11:00:00Z"), userAgent: "   " }), true);
});

test("an unsent invite still filters on the user agent", () => {
  // Marking the send is manual and gets forgotten; the rest must still work.
  assert.equal(isLikelyBot({ sentAt: null, at: new Date("2026-10-19T11:00:00Z"), userAgent: BROWSER }), false);
  assert.equal(isLikelyBot({ sentAt: null, at: new Date("2026-10-19T11:00:00Z"), userAgent: "Barracuda" }), true);
});

test("a hit before the recorded send time is not evidence of anything", () => {
  // The send was marked hours late by hand. That says nothing about the hit.
  assert.equal(isLikelyBot({ sentAt: SENT, at: new Date("2026-10-18T08:00:00Z"), userAgent: BROWSER }), false);
});

test("an unreadable send time does not swallow the hit", () => {
  assert.equal(isLikelyBot({ sentAt: "not a date", at: new Date(), userAgent: BROWSER }), false);
});

// ---------------- summariseVisits ----------------

test("the headline is separate days, because that is what a scanner cannot fake", () => {
  const s = summariseVisits([
    { created_at: "2026-10-18T09:00:01Z", likely_bot: true },
    { created_at: "2026-10-18T14:00:00Z", likely_bot: false },
    { created_at: "2026-10-18T14:05:00Z", likely_bot: false },
    { created_at: "2026-10-21T10:00:00Z", likely_bot: false },
  ]);
  assert.equal(s.human, 3);
  assert.equal(s.bot, 1);
  assert.equal(s.days, 2);
  assert.equal(s.firstHuman?.toISOString(), "2026-10-18T14:00:00.000Z");
  assert.equal(s.lastHuman?.toISOString(), "2026-10-21T10:00:00.000Z");
});

test("an invite only a scanner touched reads as untouched", () => {
  const s = summariseVisits([{ created_at: "2026-10-18T09:00:01Z", likely_bot: true }]);
  assert.equal(s.human, 0);
  assert.equal(s.days, 0);
  assert.equal(s.firstHuman, null);
});

test("nothing at all summarises to nothing", () => {
  assert.deepEqual(summariseVisits([]), { human: 0, bot: 0, days: 0, byDestination: {}, firstHuman: null, lastHuman: null });
});

// ---------------- outreachStage ----------------

const base = { sentAt: null, humanVisits: 0, pharmacy: null, manualSignedUpAt: null };

test("the stages climb as the facts arrive", () => {
  assert.deepEqual(outreachStage(base), { stage: "new", confirmed: false });
  assert.deepEqual(outreachStage({ ...base, sentAt: SENT }), { stage: "sent", confirmed: false });
  assert.deepEqual(outreachStage({ ...base, sentAt: SENT, humanVisits: 1 }), { stage: "visited", confirmed: false });
});

test("a linked pharmacy carries the rest of the funnel on its own", () => {
  const linked = { ...base, sentAt: SENT, humanVisits: 2 };
  assert.deepEqual(outreachStage({ ...linked, pharmacy: { status: "pending", submitted_at: null } }), {
    stage: "signed_up",
    confirmed: true,
  });
  assert.deepEqual(outreachStage({ ...linked, pharmacy: { status: "pending", submitted_at: SENT } }), {
    stage: "submitted",
    confirmed: true,
  });
  assert.deepEqual(outreachStage({ ...linked, pharmacy: { status: "approved", submitted_at: SENT } }), {
    stage: "approved",
    confirmed: true,
  });
});

test("marking one signed up by hand reaches the stage but is not confirmed", () => {
  const s = outreachStage({ ...base, sentAt: SENT, manualSignedUpAt: SENT });
  assert.deepEqual(s, { stage: "signed_up", confirmed: false });
});

test("a linked row outranks the hand-marked flag", () => {
  // Both set: the row is the better evidence and gets to speak.
  const s = outreachStage({
    ...base,
    manualSignedUpAt: SENT,
    pharmacy: { status: "approved", submitted_at: SENT },
  });
  assert.deepEqual(s, { stage: "approved", confirmed: true });
});

test("signing up without ever being marked sent still counts", () => {
  // The pre-existing pharmacy, linked by hand. No send, no visits, no token.
  const s = outreachStage({ ...base, pharmacy: { status: "approved", submitted_at: SENT } });
  assert.equal(s.stage, "approved");
});

test("a scanner-only hit does not promote anyone to visited", () => {
  // summariseVisits has already filtered; humanVisits is what reaches here.
  assert.equal(outreachStage({ ...base, sentAt: SENT, humanVisits: 0 }).stage, "sent");
});

// ---------------- joinUrl ----------------

test("a base URL with a trailing slash does not produce a double slash", () => {
  // What the deployed env var actually had, and what it put in every link.
  assert.equal(joinUrl("https://qapharmacy.getmed.ca/", "/i/abc"), "https://qapharmacy.getmed.ca/i/abc");
  assert.equal(joinUrl("https://qapharmacy.getmed.ca//", "i/abc"), "https://qapharmacy.getmed.ca/i/abc");
  assert.equal(joinUrl("https://qapharmacy.getmed.ca", "/i/abc"), "https://qapharmacy.getmed.ca/i/abc");
  assert.equal(joinUrl("https://qapharmacy.getmed.ca", "i/abc"), "https://qapharmacy.getmed.ca/i/abc");
});

test("the summary says which of the links in the email they opened", () => {
  const s = summariseVisits([
    { created_at: "2026-10-18T14:00:00Z", likely_bot: false, path: "rates/bolton" },
    { created_at: "2026-10-19T09:00:00Z", likely_bot: false, path: "rates/bolton" },
    { created_at: "2026-10-19T09:01:00Z", likely_bot: false, path: "home" },
    { created_at: "2026-10-18T09:00:01Z", likely_bot: true, path: "signup" },
  ]);
  // The scanner's hit on /signup is not a preference for signing up.
  assert.deepEqual(s.byDestination, { "rates/bolton": 2, home: 1 });
});

// ---------------- resolveInviteDestination ----------------

const RULES = [
  { slug: "", site: "pharmacy" as const, path: "/", appends_rest: false, label: "The pitch" },
  { slug: "signup", site: "pharmacy" as const, path: "/signup", appends_rest: false, label: "Sign-up form" },
  { slug: "rates", site: "pharmacy" as const, path: "/delivery-rates", appends_rest: true, label: "Rate card" },
  { slug: "demo", site: "patient" as const, path: "/p/demo-pharmacy", appends_rest: false, label: "Demo page" },
];

test("a bare invite follows the empty-slug rule", () => {
  for (const segs of [undefined, [], [""]]) {
    const d = resolveInviteDestination(RULES, segs);
    assert.equal(d.path, "/");
    assert.equal(d.key, "home");
  }
});

test("each slug lands where its rule says", () => {
  assert.equal(resolveInviteDestination(RULES, ["signup"]).path, "/signup");
  assert.equal(resolveInviteDestination(RULES, ["demo"]).path, "/p/demo-pharmacy");
  assert.equal(resolveInviteDestination(RULES, ["demo"]).site, "patient");
});

test("only the rule's own site is used, never the caller's", () => {
  assert.equal(resolveInviteDestination(RULES, ["signup"]).site, "pharmacy");
  assert.equal(resolveInviteDestination(RULES, []).site, "pharmacy");
});

test("an appending rule puts what follows on the end", () => {
  const d = resolveInviteDestination(RULES, ["rates", "bolton"]);
  assert.equal(d.path, "/delivery-rates/bolton");
  assert.equal(d.key, "rates/bolton");
});

test("an appending rule takes more than one segment", () => {
  assert.equal(resolveInviteDestination(RULES, ["rates", "on", "bolton"]).path, "/delivery-rates/on/bolton");
});

test("a rule that does not append ignores the tail rather than 404ing", () => {
  // /signup/nonsense is not a page. The sign-up form is what they wanted.
  assert.equal(resolveInviteDestination(RULES, ["signup", "nonsense"]).path, "/signup");
});

test("an appending rule with nothing to append stays on its own path", () => {
  assert.equal(resolveInviteDestination(RULES, ["rates"]).path, "/delivery-rates");
});

test("an unknown slug falls back to the pitch", () => {
  assert.equal(resolveInviteDestination(RULES, ["nonsense"]).key, "home");
  assert.equal(resolveInviteDestination([], ["signup"]).key, "home");
});

test("a clicker cannot walk out of the path with the bit they control", () => {
  // The appended segments come from whoever opened the link, so this is the
  // difference between a rate card and an open redirect on our own domain.
  for (const tail of [["..", "..", "evil"], ["%2e%2e%2fevil"], ["a/b"], ["a%2fb"], ["."], [""], ["  "]]) {
    const d = resolveInviteDestination(RULES, ["rates", ...tail]);
    assert.equal(d.path.includes(".."), false, tail.join("|"));
    assert.match(d.path, /^\/[a-zA-Z0-9\-/%._]*$/, tail.join("|"));
  }
});

test("a traversal attempt is dropped whole, not half-applied", () => {
  assert.equal(resolveInviteDestination(RULES, ["rates", "bolton", ".."]).key, "home");
});

test("a city with a space is escaped on its way into the path", () => {
  assert.equal(resolveInviteDestination(RULES, ["rates", "st catharines"]).path, "/delivery-rates/st%20catharines");
});

test("a rule whose stored path is unsafe is refused at the last moment", () => {
  // The column and the admin form both check; this is the check that runs
  // immediately before the redirect, where it actually counts.
  const bad = [
    { slug: "x", site: "pharmacy" as const, path: "//evil.com", appends_rest: false, label: "x" },
    { slug: "y", site: "pharmacy" as const, path: "https://evil.com", appends_rest: false, label: "y" },
    { slug: "z", site: "pharmacy" as const, path: "/a/../../b", appends_rest: false, label: "z" },
    { slug: "w", site: "pharmacy" as const, path: "signup", appends_rest: false, label: "w" },
  ];
  for (const rule of bad) assert.equal(resolveInviteDestination([rule], [rule.slug]).key, "home", rule.path);
});

// ---------------- isSafeRulePath ----------------

test("a safe path is rooted, single-slashed and has no host in it", () => {
  for (const ok of ["/", "/signup", "/delivery-rates", "/p/demo-pharmacy", "/a/b/c"]) {
    assert.equal(isSafeRulePath(ok), true, ok);
  }
  for (const bad of ["signup", "//evil.com", "https://evil.com", "/a/../b", "/a\\b", "mailto:x@y.z", "/x:y"]) {
    assert.equal(isSafeRulePath(bad), false, bad);
  }
});
