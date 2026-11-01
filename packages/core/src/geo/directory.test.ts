import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizePostal, parseDirectoryQuery, sortDirectory } from "./directory.ts";

// ---------------- postal codes ----------------

test("a postal code is recognised however it was typed", () => {
  for (const typed of ["L7E 2L4", "l7e2l4", "  L7E2L4 ", "L7e 2L4"]) {
    assert.equal(normalizePostal(typed), "L7E 2L4", typed);
  }
});

test("the first half alone is a postal code too", () => {
  assert.equal(normalizePostal("L7E"), "L7E");
  assert.equal(normalizePostal("l7e"), "L7E");
});

test("things that are not postal codes are not treated as one", () => {
  for (const typed of ["Bolton", "L7", "12345", "90210", "Pharmacy", "LLL 111"]) {
    assert.equal(normalizePostal(typed), null, typed);
  }
});

// ---------------- what the patient meant ----------------

test("one character is not a search", () => {
  assert.deepEqual(parseDirectoryQuery("B"), { text: null, postal: null, patterns: [] });
  assert.deepEqual(parseDirectoryQuery("  "), { text: null, postal: null, patterns: [] });
});

test("a postal code matches by prefix, spaced or not", () => {
  const q = parseDirectoryQuery("L7E2L4");
  assert.equal(q.postal, "L7E 2L4");
  assert.deepEqual(q.patterns, ["L7E 2L4%", "L7E2L4%"]);
});

test("the first half of a postal code finds the whole area", () => {
  const q = parseDirectoryQuery("L7E");
  assert.deepEqual(q.patterns, ["L7E%", "L7E%"]);
});

test("a name is matched anywhere in the name", () => {
  assert.deepEqual(parseDirectoryQuery("Bolton").patterns, ["%Bolton%"]);
});

test("ilike wildcards a patient typed are escaped, not honoured", () => {
  // Otherwise "A_B" matches "AxB", and a stray % matches the whole list.
  assert.deepEqual(parseDirectoryQuery("A_B").patterns, ["%A\\_B%"]);
  assert.deepEqual(parseDirectoryQuery("50%").patterns, ["%50\\%%"]);
});

// ---------------- ranking ----------------

const rows = [
  { name: "Village Bolton Pharmacy", city: "Brampton", postal_code: "L6T 1A1" },
  { name: "Dayspring Pharmacy", city: "Bolton", postal_code: "L7E 2L4" },
  { name: "Bolton Pharmacy", city: "Caledon", postal_code: "L7E 1B2" },
  { name: "Boltonia Drugs", city: "Vaughan", postal_code: "L4H 0A1" },
];

test("an exact name wins, then a name that starts with it, then one containing it", () => {
  const q = parseDirectoryQuery("Bolton");
  assert.deepEqual(sortDirectory(rows, q).map((r) => r.name), [
    "Bolton Pharmacy",         // exact
    "Boltonia Drugs",          // starts with it
    "Village Bolton Pharmacy", // contains it
    "Dayspring Pharmacy",      // only the city matches
  ]);
});

test("two names of the same rank fall back to alphabetical", () => {
  // Both start with "Bolton", so neither is a better answer than the other.
  const q = parseDirectoryQuery("Bolton");
  const both = [
    { name: "Bolton Street Pharmacy", city: "Brampton", postal_code: "L6T 1A1" },
    { name: "Boltonia Drugs", city: "Vaughan", postal_code: "L4H 0A1" },
  ];
  assert.deepEqual(sortDirectory(both, q).map((r) => r.name), ["Bolton Street Pharmacy", "Boltonia Drugs"]);
});

test("the order is stable, so the list does not reshuffle between loads", () => {
  const q = parseDirectoryQuery("Pharmacy");
  const once = sortDirectory(rows, q).map((r) => r.name);
  const twice = sortDirectory([...rows].reverse(), q).map((r) => r.name);
  assert.deepEqual(once, twice);
});

test("with nothing searched for, nothing is reordered into a surprise", () => {
  const q = parseDirectoryQuery("");
  assert.deepEqual(sortDirectory(rows, q).map((r) => r.name), [
    "Bolton Pharmacy", "Boltonia Drugs", "Dayspring Pharmacy", "Village Bolton Pharmacy",
  ]);
});
