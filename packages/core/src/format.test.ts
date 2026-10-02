import { test } from "node:test";
import assert from "node:assert/strict";
import { dateInputValue, dayBounds, defaultDateWindow, isOnLocalDay, pharmacySlug } from "./format.ts";

test("the default window is today and the four days before it", () => {
  const w = defaultDateWindow(5, new Date("2026-09-30T14:00:00"));
  assert.equal(w.to, "2026-09-30");
  assert.equal(w.from, "2026-09-26", "five days inclusive, not five days back");
});

test("the window covers whole local days, with the last day included", () => {
  const { startIso, endIso } = dayBounds("2026-09-26", "2026-09-30");
  // The end is the start of the following day, so an order placed at 23:59 on
  // the last day is inside the window — an `lte` on that date would miss it.
  assert.equal(new Date(startIso).getDate(), 26);
  assert.equal(new Date(endIso).getDate(), 1);
  assert.equal(new Date(endIso).getMonth(), 9, "September 30 rolls into October 1");
});

test("a single-day window is still a whole day", () => {
  const { startIso, endIso } = dayBounds("2026-09-30", "2026-09-30");
  assert.equal(new Date(endIso).getTime() - new Date(startIso).getTime(), 86400000);
});

test("a timestamp is matched against the local calendar day", () => {
  const noon = new Date("2026-09-30T12:00:00").toISOString();
  assert.equal(isOnLocalDay(noon, "2026-09-30"), true);
  assert.equal(isOnLocalDay(noon, "2026-09-29"), false);
  assert.equal(isOnLocalDay(null, "2026-09-30"), false);
});

test("date input values are zero-padded", () => {
  assert.equal(dateInputValue(new Date("2026-01-05T10:00:00")), "2026-01-05");
});

test("a pharmacy slug carries its postal code, so one chain can have many branches", () => {
  // The case that prompted this: the same name in three places.
  assert.equal(pharmacySlug("Shoppers Drug Mart", "M5V 3A8"), "shoppers-drug-mart-m5v3a8");
  assert.equal(pharmacySlug("Shoppers Drug Mart", "L6P 1A1"), "shoppers-drug-mart-l6p1a1");
  assert.notEqual(
    pharmacySlug("Shoppers Drug Mart", "M5V 3A8"),
    pharmacySlug("Shoppers Drug Mart", "M5V 2T6"),
    "two branches in the same FSA must still differ",
  );
});

test("a postal code is normalised however it was typed", () => {
  for (const typed of ["M5V 3A8", "m5v3a8", "  M5V3A8 ", "m5v-3a8"]) {
    assert.equal(pharmacySlug("Rx Depot", typed), "rx-depot-m5v3a8", `${typed} should normalise`);
  }
});

test("an unusable postal code leaves the slug alone rather than appending rubbish", () => {
  assert.equal(pharmacySlug("Rx Depot", null), "rx-depot");
  assert.equal(pharmacySlug("Rx Depot", ""), "rx-depot");
  assert.equal(pharmacySlug("Rx Depot", "not a postcode"), "rx-depot");
  // Only the forward sortation area is usable, so that is what is used.
  assert.equal(pharmacySlug("Rx Depot", "M5V"), "rx-depot-m5v");
});

test("a very long name cannot push the postal code out of the slug", () => {
  const slug = pharmacySlug("The Greater Metropolitan Community Pharmacy and Wellness Dispensary of Ontario", "M5V 3A8");
  assert.ok(slug.endsWith("-m5v3a8"), `postal code missing from ${slug}`);
  assert.ok(slug.length <= 60, `slug too long: ${slug.length}`);
  assert.ok(!slug.includes("--"), "no doubled separator where the name was cut");
});
