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

test("a failed delivery can be sent out again by the pharmacy or an admin", () => {
  assert.equal(canTransition("return_to_delivery", "failed", "pharmacy"), true);
  assert.equal(canTransition("return_to_delivery", "failed", "admin"), true);
  // Not the driver's call, and not a way to revive any other terminal status.
  assert.equal(canTransition("return_to_delivery", "failed", "driver"), false);
  assert.equal(canTransition("return_to_delivery", "cancelled", "pharmacy"), false);
  assert.equal(canTransition("return_to_delivery", "rejected", "admin"), false);
  assert.equal(canTransition("return_to_delivery", "delivered", "admin"), false);
});

test("sending a failed order out again is the ONLY thing the pharmacy may do to it", () => {
  assert.deepEqual(availableActions("failed", "pharmacy"), ["return_to_delivery"]);
  assert.equal(canTransition("cancel", "failed", "pharmacy"), false);
  assert.equal(canTransition("mark_ready", "failed", "pharmacy"), false);
  assert.equal(canTransition("accept", "failed", "pharmacy"), false);
});

test("a re-queued order picks the normal flow back up", () => {
  // return_to_delivery lands on ready_for_delivery, where admin assigns again.
  assert.equal(canTransition("assign_driver", "ready_for_delivery", "admin"), true);
});
