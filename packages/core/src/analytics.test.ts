import { strict as assert } from "node:assert";
import { test } from "node:test";
import { redactAnalyticsPath } from "./analytics.ts";

const UNSUB = [{ prefix: "/u", as: "/u/[token]" }];

test("an ordinary page is reported as it is", () => {
  assert.equal(redactAnalyticsPath("/"), "/");
  assert.equal(redactAnalyticsPath("/faq"), "/faq");
  assert.equal(redactAnalyticsPath("/how-it-works"), "/how-it-works");
  // A pharmacy's slug is public and is the thing worth counting.
  assert.equal(redactAnalyticsPath("/p/bolton-family-pharmacy"), "/p/bolton-family-pharmacy");
  assert.equal(redactAnalyticsPath("/delivery-rates/mississauga"), "/delivery-rates/mississauga");
});

test("an id in the path is counted without being named", () => {
  assert.equal(
    redactAnalyticsPath("/orders/3f2504e0-4f89-41d3-9a0c-0305e82c3301"),
    "/orders/[id]",
  );
  assert.equal(
    redactAnalyticsPath("/invoices/3F2504E0-4F89-41D3-9A0C-0305E82C3301"),
    "/invoices/[id]",
  );
  assert.equal(
    redactAnalyticsPath("/consultations/3f2504e0-4f89-41d3-9a0c-0305e82c3301/notes"),
    "/consultations/[id]/notes",
  );
});

test("the unsubscribe token never leaves", () => {
  // Holding this token is holding the link: it unsubscribes that pharmacy.
  assert.equal(redactAnalyticsPath("/u/aB3kD9xQ2mZp", UNSUB), "/u/[token]");
  assert.equal(redactAnalyticsPath("/u", UNSUB), "/u/[token]");
  assert.equal(redactAnalyticsPath("/u/aB3kD9xQ2mZp/", UNSUB), "/u/[token]");
});

test("a rule matches a path segment, not a prefix of a word", () => {
  assert.equal(redactAnalyticsPath("/updates", UNSUB), "/updates");
  assert.equal(redactAnalyticsPath("/unsubscribed", UNSUB), "/unsubscribed");
});

test("a trailing slash is the same page", () => {
  assert.equal(redactAnalyticsPath("/faq/"), "/faq");
  assert.equal(redactAnalyticsPath("//"), "/");
});

test("a rule can drop a page view rather than collapse it", () => {
  assert.equal(redactAnalyticsPath("/u/aB3kD9xQ2mZp", [{ prefix: "/u", as: null }]), null);
});

test("the first matching rule wins, so an exact page can come first", () => {
  const rules = [{ prefix: "/u/about", as: "/u/about" }, { prefix: "/u", as: "/u/[token]" }];
  assert.equal(redactAnalyticsPath("/u/about", rules), "/u/about");
  assert.equal(redactAnalyticsPath("/u/aB3kD9xQ2mZp", rules), "/u/[token]");
});

test("something that merely looks long is not mistaken for an id", () => {
  assert.equal(redactAnalyticsPath("/p/shoppers-drug-mart-1234"), "/p/shoppers-drug-mart-1234");
  assert.equal(redactAnalyticsPath("/p/3f2504e04f8941d39a0c"), "/p/3f2504e04f8941d39a0c");
});
