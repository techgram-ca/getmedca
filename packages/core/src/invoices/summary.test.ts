import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBreakdown, monthBounds, type InvoiceLine } from "./summary.ts";

const line = (type: InvoiceLine["type"], fee: number, id = Math.random().toString()): InvoiceLine => ({
  orderId: id,
  deliveredAt: "2026-09-10T12:00:00Z",
  fee,
  type,
  kind: "delivery",
  attempt: 1,
});

/** A trip that failed and was billed its share of the quoted fee. */
const failedLine = (type: InvoiceLine["type"], fee: number, attempt = 1): InvoiceLine => ({
  ...line(type, fee),
  kind: "failed_delivery",
  attempt,
});

test("groups deliveries by type in a fixed order", () => {
  const rows = buildBreakdown([line("gta", 8), line("local", 5), line("local", 5), line("custom", 20)]);
  assert.deepEqual(rows.map((r) => r.type), ["local", "gta", "custom"]);
  assert.equal(rows[0]!.count, 2);
  assert.equal(rows[0]!.subtotal, 10);
  assert.equal(rows[0]!.unitPrice, 5);
});

test("reports a unit price only when every order matched it", () => {
  const rows = buildBreakdown([line("custom", 20), line("custom", 35)]);
  assert.equal(rows[0]!.count, 2);
  assert.equal(rows[0]!.subtotal, 55);
  assert.equal(rows[0]!.unitPrice, null);
});

test("orders with no type are reported separately, never folded into a tier", () => {
  const rows = buildBreakdown([line("local", 5), line(null, 8)]);
  assert.deepEqual(rows.map((r) => r.type), ["local", "uncategorised"]);
  assert.equal(rows[1]!.label, "Uncategorised");
  assert.equal(rows[1]!.subtotal, 8);
});

test("empty period produces no rows", () => {
  assert.deepEqual(buildBreakdown([]), []);
});

test("month bounds cover exactly one UTC month", () => {
  const b = monthBounds("2026-02")!;
  assert.equal(b.start.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(b.end.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(monthBounds("2026-13"), null);
});

test("failed attempts bill on their own row, not inside a delivery tier", () => {
  const rows = buildBreakdown([line("local", 5), line("local", 5), failedLine("local", 5)]);
  assert.deepEqual(rows.map((r) => r.type), ["local", "failed"]);
  // The delivery tier keeps its clean unit price.
  assert.equal(rows[0]!.count, 2);
  assert.equal(rows[0]!.subtotal, 10);
  assert.equal(rows[0]!.unitPrice, 5);
  assert.equal(rows[1]!.label, "Failed delivery attempts");
  assert.equal(rows[1]!.count, 1);
  assert.equal(rows[1]!.subtotal, 5);
});

test("a retried order bills once per attempt", () => {
  // Attempt 1 failed at half the fee, attempt 2 delivered at the full fee.
  const rows = buildBreakdown([failedLine("gta", 4, 1), { ...line("gta", 8), attempt: 2 }]);
  assert.deepEqual(rows.map((r) => r.type), ["gta", "failed"]);
  assert.equal(rows.reduce((s, r) => s + r.subtotal, 0), 12);
});

test("failed attempts at differing rates report no unit price", () => {
  const rows = buildBreakdown([failedLine("local", 5), failedLine("gta", 8)]);
  assert.equal(rows[0]!.type, "failed");
  assert.equal(rows[0]!.count, 2);
  assert.equal(rows[0]!.unitPrice, null);
});
