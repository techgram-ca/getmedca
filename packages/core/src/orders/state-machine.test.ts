import { test } from "node:test";
import assert from "node:assert/strict";
import { availableActions, canTransition, pharmacyCanModify } from "./state-machine.ts";

test("pharmacy can accept/reject only from pending", () => {
  assert.equal(canTransition("accept", "pending", "pharmacy"), true);
  assert.equal(canTransition("reject", "pending", "pharmacy"), true);
  assert.equal(canTransition("accept", "accepted", "pharmacy"), false);
  assert.equal(canTransition("reject", "accepted", "pharmacy"), false);
});

test("pharmacy cancel only after accept, before pickup", () => {
  assert.equal(canTransition("cancel", "pending", "pharmacy"), false);
  assert.equal(canTransition("cancel", "accepted", "pharmacy"), true);
  assert.equal(canTransition("cancel", "assigned", "pharmacy"), true);
  assert.equal(canTransition("cancel", "picked_up", "pharmacy"), false);
});

test("pharmacy loses write access at picked_up", () => {
  assert.equal(pharmacyCanModify("assigned"), true);
  assert.equal(pharmacyCanModify("picked_up"), false);
  assert.deepEqual(availableActions("picked_up", "pharmacy"), []);
});

test("driver flow", () => {
  assert.equal(canTransition("pick_up", "assigned", "driver"), true);
  assert.equal(canTransition("deliver", "picked_up", "driver"), true);
  assert.equal(canTransition("fail", "picked_up", "driver"), true);
  assert.equal(canTransition("deliver", "assigned", "driver"), false);
  assert.equal(canTransition("pick_up", "assigned", "pharmacy"), false);
});

test("only system times out, only from pending", () => {
  assert.equal(canTransition("time_out", "pending", "system"), true);
  assert.equal(canTransition("time_out", "accepted", "system"), false);
  assert.equal(canTransition("time_out", "pending", "admin"), false);
});
