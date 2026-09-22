import { test } from "node:test";
import assert from "node:assert/strict";
import { languageKey } from "./listing.ts";

test("language matching ignores case and stray whitespace", () => {
  // Pharmacies type these by hand, so "English", "english " and "ENGLISH" all
  // have to land on the same filter chip.
  assert.equal(languageKey("English"), "english");
  assert.equal(languageKey(" english "), "english");
  assert.equal(languageKey("ENGLISH"), "english");
  assert.notEqual(languageKey("French"), languageKey("English"));
});
