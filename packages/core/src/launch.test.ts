import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, isLaunched } from "./settings.ts";

test("a database arrives un-launched, and only a timestamp opens it", () => {
  // Launching is a deliberate act. A migration adding the column must never
  // open the site on someone's behalf, so null is the pre-launch state and the
  // default every existing row gets.
  assert.equal(DEFAULT_SETTINGS.launched_at, null);
  assert.equal(isLaunched(DEFAULT_SETTINGS), false);

  assert.equal(isLaunched({ launched_at: "2026-10-06T12:00:00Z" }), true);
  assert.equal(isLaunched({ launched_at: null }), false);
});

test("a launch message does not launch anything", () => {
  // Writing the coming-soon copy is how an admin prepares; it must not be
  // mistaken for the switch.
  const withCopy = { ...DEFAULT_SETTINGS, launch_message: "Opening soon!" };
  assert.equal(isLaunched(withCopy), false);
});
