import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  BOT_WINDOW_MS,
  generateOutreachToken,
  isLikelyBot,
  joinUrl,
  outreachStage,
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

// ---------------- resolveInviteDestination ----------------

test("a bare invite goes to the pitch", () => {
  assert.deepEqual(resolveInviteDestination(undefined), { key: "home", path: "/", label: "The pitch" });
  assert.deepEqual(resolveInviteDestination([]), { key: "home", path: "/", label: "The pitch" });
});

test("each suffix lands where it says", () => {
  assert.equal(resolveInviteDestination(["signup"]).path, "/signup");
  assert.equal(resolveInviteDestination(["rates", "bolton"]).path, "/delivery-rates/bolton");
  assert.equal(resolveInviteDestination(["rates", "bolton"]).key, "rates/bolton");
});

test("the demo page is on the patient site, not this one", () => {
  // The bug this replaces: a relative /p/... resolved against the pharmacy
  // app, which has no such page, so the proxy bounced it to /login.
  const d = resolveInviteDestination(["demo"]);
  assert.equal(d.patient, true);
  assert.equal(d.path, "/p/demo-pharmacy");
});

test("only the demo link is on the patient site", () => {
  for (const segs of [undefined, ["signup"], ["rates", "bolton"]]) {
    assert.notEqual(resolveInviteDestination(segs as string[] | undefined).patient, true);
  }
});

test("a mangled suffix still lands somewhere useful", () => {
  // A link broken by a mail client is still a pharmacy who clicked.
  assert.equal(resolveInviteDestination(["nonsense"]).key, "home");
  assert.equal(resolveInviteDestination(["rates"]).key, "home");
  assert.equal(resolveInviteDestination([""]).key, "home");
});

test("a city is escaped on its way into a path", () => {
  assert.equal(resolveInviteDestination(["rates", "st catharines"]).path, "/delivery-rates/st%20catharines");
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
