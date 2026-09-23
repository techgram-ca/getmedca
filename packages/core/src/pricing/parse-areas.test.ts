import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFsaText, toZoneText, validateZoneAreas, type ZoneTextInput } from "./parse-areas.ts";

const known = new Set(["M5V", "M5A", "M4B", "L6P", "L6R", "L5B"]);
const boxes = (partial: Partial<ZoneTextInput>): ZoneTextInput => ({ zone1: "", zone2: "", zone3: "", zone4: "", ...partial });

test("postal areas are parsed however the admin separated them", () => {
  // Pasted from a spreadsheet column, typed with commas, or a mix of both.
  assert.deepEqual(parseFsaText("M5V, M5A\nM4B\tL6P  L6R").codes, ["M5V", "M5A", "M4B", "L6P", "L6R"]);
  assert.deepEqual(parseFsaText("m5v,m5a").codes, ["M5V", "M5A"], "lowercase is accepted");
  assert.deepEqual(parseFsaText("  ").codes, []);
});

test("anything not shaped like a postal area is reported, not dropped", () => {
  const r = parseFsaText("M5V, M5B1, XY, 123, L6P");
  assert.deepEqual(r.codes, ["M5V", "L6P"]);
  assert.deepEqual(r.malformed, ["M5B1", "XY", "123"]);
});

test("a clean set of boxes produces the assignment to save", () => {
  const v = validateZoneAreas(boxes({ zone1: "M5V M5A", zone2: "L6P, L6R" }), known);
  assert.equal(v.ok, true);
  assert.equal(v.total, 4);
  assert.deepEqual(v.assignments, { M5V: "zone1", M5A: "zone1", L6P: "zone2", L6R: "zone2" });
});

test("one city can be split across zones", () => {
  // The whole reason the boxes are free text: some of Brampton in Zone 1, the
  // rest in Zone 2.
  const v = validateZoneAreas(boxes({ zone1: "L6P", zone2: "L6R" }), known);
  assert.equal(v.ok, true);
  assert.deepEqual(v.assignments, { L6P: "zone1", L6R: "zone2" });
});

test("a postal code in two zones blocks the save and names both", () => {
  const v = validateZoneAreas(boxes({ zone1: "M5V, M5A", zone2: "M5V" }), known);
  assert.equal(v.ok, false);
  assert.deepEqual(v.duplicates, [{ fsa: "M5V", zones: ["zone1", "zone2"] }]);
  assert.deepEqual(v.perZone.zone1.duplicated, ["M5V"]);
  assert.deepEqual(v.perZone.zone2.duplicated, ["M5V"]);
  // The unambiguous ones are still resolved, so the editor can show a count.
  assert.deepEqual(v.assignments, { M5A: "zone1" });
});

test("the same code repeated inside one box is just a typo", () => {
  const v = validateZoneAreas(boxes({ zone1: "M5V, M5V, M5A" }), known);
  assert.equal(v.ok, true);
  assert.equal(v.total, 2);
});

test("a postal code that is not on file is rejected, not invented", () => {
  const v = validateZoneAreas(boxes({ zone1: "M5V, Z9Z" }), known);
  assert.equal(v.ok, false);
  assert.deepEqual(v.unknown, ["Z9Z"]);
  assert.deepEqual(v.perZone.zone1.valid, ["M5V"]);
});

test("malformed input blocks the save", () => {
  const v = validateZoneAreas(boxes({ zone1: "M5V, oops" }), known);
  assert.equal(v.ok, false);
  assert.deepEqual(v.malformed, ["OOPS"]);
});

test("empty boxes are valid — a pharmacy may have nothing tagged yet", () => {
  const v = validateZoneAreas(boxes({}), known);
  assert.equal(v.ok, true);
  assert.equal(v.total, 0);
  assert.deepEqual(v.assignments, {});
});

test("saved assignments round-trip back into the boxes, sorted", () => {
  const text = toZoneText({ M5V: "zone1", M5A: "zone1", L6P: "zone2" });
  assert.equal(text.zone1, "M5A, M5V");
  assert.equal(text.zone2, "L6P");
  assert.equal(text.zone3, "");
  const back = validateZoneAreas(text, known);
  assert.deepEqual(back.assignments, { M5V: "zone1", M5A: "zone1", L6P: "zone2" });
});
