import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { addressSchema, isCompleteAddress, optionalNumberField, requiredNumberField } from "./common.ts";

const price = z.number().min(0, "Price cannot be negative").max(1000, "That price looks too high");
const optional = optionalNumberField(price, "Enter a price");
const required = requiredNumberField(price, "Enter a price");

test("a blank optional field stays null instead of becoming zero", () => {
  for (const blank of ["", "   ", null, undefined]) {
    const r = optional.safeParse(blank);
    assert.equal(r.success, true, `blank input ${JSON.stringify(blank)} should parse`);
    assert.equal(r.data, null, `blank input ${JSON.stringify(blank)} must not coerce to 0`);
  }
});

test("optional fields still read real numbers, including an explicit zero", () => {
  assert.equal(optional.parse("7.50"), 7.5);
  assert.equal(optional.parse(" 12 "), 12);
  assert.equal(optional.parse(9), 9);
  assert.equal(optional.parse("0"), 0);
});

test("optional fields reject junk and out-of-range values with a readable message", () => {
  assert.equal(optional.safeParse("abc").error?.issues[0]?.message, "Enter a price");
  assert.equal(optional.safeParse("-1").error?.issues[0]?.message, "Price cannot be negative");
  assert.equal(optional.safeParse("5000").error?.issues[0]?.message, "That price looks too high");
});

test("a blank required field fails rather than silently saving zero", () => {
  for (const blank of ["", "  ", null, undefined]) {
    const r = required.safeParse(blank);
    assert.equal(r.success, false, `blank input ${JSON.stringify(blank)} should fail`);
    assert.equal(r.error?.issues[0]?.message, "Enter a price");
  }
  assert.equal(required.parse("8"), 8);
  assert.equal(required.parse("0"), 0);
});

test("editing one price leaves the other delivery types untouched", () => {
  // The shape of the admin pricing form: blanks mean "charge the default".
  const overrides = z.object({ local: optional, gta: optional, extended: optional });
  assert.deepEqual(overrides.parse({ local: "6.25", gta: "", extended: "" }), {
    local: 6.25,
    gta: null,
    extended: null,
  });
});

test("an address carried from search is only confirmed when it is submittable", () => {
  const picked = { line: "12 Queen Street North", postalCode: "L7E 1E8", lat: 43.8783, lng: -79.7375 };
  assert.equal(isCompleteAddress(picked), true, "a picked address should not be re-asked");

  // Each of these produced the bug: the order form showed an address for
  // confirmation, then refused to submit it.
  assert.equal(isCompleteAddress({ ...picked, postalCode: null }), false, "no postal code — the case that broke ordering");
  assert.equal(isCompleteAddress({ ...picked, lat: null }), false);
  assert.equal(isCompleteAddress({ ...picked, lng: null }), false);
  assert.equal(isCompleteAddress({ ...picked, line: "   " }), false);
  assert.equal(isCompleteAddress({ ...picked, postalCode: "  " }), false);
  assert.equal(isCompleteAddress(null), false);
  assert.equal(isCompleteAddress(undefined), false);
});

test("a complete address satisfies the schema it is standing in for", () => {
  // The two must not drift: whatever isCompleteAddress passes, addressSchema
  // must accept, or the form confirms an address the server then rejects.
  const picked = { line: "12 Queen Street North", city: "Bolton", postalCode: "L7E 1E8", lat: 43.8783, lng: -79.7375 };
  assert.equal(isCompleteAddress(picked), true);
  assert.equal(addressSchema.safeParse(picked).success, true);
});
