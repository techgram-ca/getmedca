import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_KEYS, SIGNUP_DEFAULT_HOURS, isOpenNow } from "./hours.ts";

test("a pharmacy that skipped the hours step opens 9 to 6, closed Sunday", () => {
  // Signup no longer asks, so this is what every new pharmacy gets until it
  // edits its own. Getting it wrong means a wrong open/closed badge on a real
  // pharmacy's public page.
  for (const day of DAY_KEYS) {
    const h = SIGNUP_DEFAULT_HOURS[day];
    assert.ok(h, `${day} missing`);
    assert.equal(h.open, "09:00", `${day} should open at 9`);
    assert.equal(h.close, "18:00", `${day} should close at 6`);
  }
  assert.equal(SIGNUP_DEFAULT_HOURS.sun?.closed, true, "Sunday must be closed");
  for (const day of DAY_KEYS.filter((d) => d !== "sun")) {
    assert.notEqual(SIGNUP_DEFAULT_HOURS[day]?.closed, true, `${day} must not be closed`);
  }
});

test("the default hours drive the open/closed badge rather than sitting unused", () => {
  // A Wednesday at 10am in Toronto, and the same Sunday.
  const wed = new Date("2026-10-07T14:00:00Z");
  const sun = new Date("2026-10-11T14:00:00Z");
  assert.equal(isOpenNow(SIGNUP_DEFAULT_HOURS, wed).open, true);
  assert.equal(isOpenNow(SIGNUP_DEFAULT_HOURS, sun).open, false);
});
