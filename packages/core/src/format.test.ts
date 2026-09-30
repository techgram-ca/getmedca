import { test } from "node:test";
import assert from "node:assert/strict";
import { dateInputValue, dayBounds, defaultDateWindow, isOnLocalDay } from "./format.ts";

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
