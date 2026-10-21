import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_TEMPLATE, outreachPlaceholders, renderOutreachEmail } from "./email.ts";
import type { LinkRule } from "./index.ts";

const RULES: LinkRule[] = [
  { slug: "", site: "pharmacy", path: "/", appends_rest: false, label: "The pitch (pharmacy home)" },
  { slug: "signup", site: "pharmacy", path: "/signup", appends_rest: false, label: "Sign-up form" },
  { slug: "rates", site: "pharmacy", path: "/delivery-rates", appends_rest: true, label: "Delivery rate card" },
  { slug: "demo", site: "patient", path: "/p/demo-pharmacy", appends_rest: false, label: "Demo pharmacy page" },
];

const URL = "https://pharmacy.getmed.ca";
const CONTACT = { pharmacy_name: "Bolton Rx", city: "Bolton", token: "aB3kD9xQ2mZp" };

// ---------------- placeholders ----------------

test("every link rule becomes a placeholder, named after its slug", () => {
  const keys = outreachPlaceholders(CONTACT, RULES, URL).map((p) => p.key);
  assert.deepEqual(keys, [
    "[pharmacy-name]",
    "[pharmacy-city-caps]",
    "[pharmacy-city]",
    "[pitch-link]",
    "[signup-link]",
    "[rates-link]",
    "[demo-link]",
    "[unsubscribe-link]",
    "[pharmacy-token]",
  ]);
});

test("the bare rule is offered once, as the pitch link", () => {
  const keys = outreachPlaceholders(CONTACT, RULES, URL).map((p) => p.key);
  assert.equal(keys.filter((k) => k === "[pitch-link]").length, 1);
  assert.ok(!keys.includes("[-link]"));
});

test("placeholders resolve to whole URLs, so no template names the origin", () => {
  const by = new Map(outreachPlaceholders(CONTACT, RULES, URL).map((p) => [p.key, p.example]));
  assert.equal(by.get("[pitch-link]"), "https://pharmacy.getmed.ca/i/aB3kD9xQ2mZp");
  assert.equal(by.get("[signup-link]"), "https://pharmacy.getmed.ca/i/aB3kD9xQ2mZp/signup");
  assert.equal(by.get("[unsubscribe-link]"), "https://pharmacy.getmed.ca/u/aB3kD9xQ2mZp");
});

test("an appending rule takes the contact's city, slugified", () => {
  const by = new Map(outreachPlaceholders({ ...CONTACT, city: "Richmond Hill" }, RULES, URL).map((p) => [p.key, p.example]));
  assert.equal(by.get("[rates-link]"), "https://pharmacy.getmed.ca/i/aB3kD9xQ2mZp/rates/richmond-hill");
});

test("the two city forms suit the two uses: a sentence and a URL", () => {
  const by = new Map(
    outreachPlaceholders({ ...CONTACT, city: "richmond hill" }, RULES, URL).map((p) => [p.key, p.example]),
  );
  assert.equal(by.get("[pharmacy-city-caps]"), "Richmond Hill");
  assert.equal(by.get("[pharmacy-city]"), "richmond-hill");
});

test("a city typed in any case comes out right both ways", () => {
  for (const typed of ["BOLTON", "bolton", "Bolton", "  bolton  "]) {
    const by = new Map(outreachPlaceholders({ ...CONTACT, city: typed }, RULES, URL).map((p) => [p.key, p.example]));
    assert.equal(by.get("[pharmacy-city-caps]"), "Bolton", typed);
    assert.equal(by.get("[pharmacy-city]"), "bolton", typed);
  }
});

test("the link form of the city matches what the rate-card link uses", () => {
  const by = new Map(
    outreachPlaceholders({ ...CONTACT, city: "Richmond Hill" }, RULES, URL).map((p) => [p.key, p.example]),
  );
  // A hand-built URL and the generated one must not disagree about the city.
  assert.ok(by.get("[rates-link]")!.endsWith(`/${by.get("[pharmacy-city]")}`));
});

test("a contact with no city is not offered a rate-card link that would 404", () => {
  const keys = outreachPlaceholders({ ...CONTACT, city: null }, RULES, URL).map((p) => p.key);
  assert.ok(!keys.includes("[rates-link]"));
  assert.ok(keys.includes("[signup-link]"), "the non-appending ones still work");
});

test("a base URL with a trailing slash does not double it", () => {
  const by = new Map(outreachPlaceholders(CONTACT, RULES, "https://qapharmacy.getmed.ca/").map((p) => [p.key, p.example]));
  assert.equal(by.get("[pitch-link]"), "https://qapharmacy.getmed.ca/i/aB3kD9xQ2mZp");
});

// ---------------- rendering ----------------

test("name, city and links are substituted in body and subject alike", () => {
  const r = renderOutreachEmail(
    { subject: "Delivery for [pharmacy-name]", body: `<a href="[signup-link]">Join</a> in [pharmacy-city]` },
    CONTACT,
    RULES,
    URL,
  );
  assert.equal(r.subject, "Delivery for Bolton Rx");
  assert.equal(r.html, '<a href="https://pharmacy.getmed.ca/i/aB3kD9xQ2mZp/signup">Join</a> in bolton');
  assert.deepEqual(r.unknown, []);
});

test("a placeholder used more than once is replaced every time", () => {
  const r = renderOutreachEmail({ subject: "", body: "[pharmacy-name] — [pharmacy-name]" }, CONTACT, RULES, URL);
  assert.equal(r.html, "Bolton Rx — Bolton Rx");
});

test("a misspelt placeholder is reported, not silently blanked", () => {
  const r = renderOutreachEmail({ subject: "", body: "Hello [pharmcy-name], see [rate-link]" }, CONTACT, RULES, URL);
  assert.deepEqual(r.unknown.sort(), ["[pharmcy-name]", "[rate-link]"]);
  // Left in the text, so the preview shows the problem rather than a gap.
  assert.ok(r.html.includes("[pharmcy-name]"));
});

test("a rate-card link on a contact with no city is reported, not emitted broken", () => {
  const r = renderOutreachEmail({ subject: "", body: 'See <a href="[rates-link]">rates</a>' }, { ...CONTACT, city: null }, RULES, URL);
  assert.deepEqual(r.unknown, ["[rates-link]"]);
  assert.ok(!r.html.includes("/rates/"), "no half-built URL goes out");
});

test("ordinary bracketed prose is left alone and not called a typo", () => {
  const r = renderOutreachEmail({ subject: "", body: "[see below] and [1] and [TBC]" }, CONTACT, RULES, URL);
  assert.deepEqual(r.unknown, []);
  assert.equal(r.html, "[see below] and [1] and [TBC]");
});

test("placeholders are case-insensitive, since they get retyped by hand", () => {
  const r = renderOutreachEmail({ subject: "", body: "[Pharmacy-Name]" }, CONTACT, RULES, URL);
  assert.equal(r.html, "Bolton Rx");
  assert.deepEqual(r.unknown, []);
});

test("which placeholders were used is reported back", () => {
  const r = renderOutreachEmail({ subject: "[pharmacy-name]", body: "[pitch-link]" }, CONTACT, RULES, URL);
  assert.deepEqual(r.used.sort(), ["[pharmacy-name]", "[pitch-link]"]);
});

// ---------------- the shipped default ----------------

test("the default template renders with no unknown placeholders", () => {
  const r = renderOutreachEmail(DEFAULT_TEMPLATE, CONTACT, RULES, URL);
  assert.deepEqual(r.unknown, [], "the template we ship must not warn on the rules we seed");
  assert.ok(!r.html.includes("["), "nothing bracketed survives a full render");
});

test("the default template leaves no token or raw bracket in the subject", () => {
  const r = renderOutreachEmail(DEFAULT_TEMPLATE, CONTACT, RULES, URL);
  assert.equal(r.subject, "Delivery for Bolton Rx, run by GetMed");
});

test("the default template reads the city as prose, not as a slug", () => {
  const r = renderOutreachEmail(DEFAULT_TEMPLATE, { ...CONTACT, city: "richmond hill" }, RULES, URL);
  assert.ok(r.html.includes("pharmacies in Richmond Hill"), "the body is a sentence");
  assert.ok(!r.html.includes("pharmacies in richmond-hill"));
  assert.ok(r.html.includes("/rates/richmond-hill"), "the link is still a slug");
});

test("the default template carries an unsubscribe link, which it is sent under", () => {
  const r = renderOutreachEmail(DEFAULT_TEMPLATE, CONTACT, RULES, URL);
  assert.ok(r.html.includes("https://pharmacy.getmed.ca/u/aB3kD9xQ2mZp"));
});
