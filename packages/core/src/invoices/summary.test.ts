import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBreakdown, monthBounds, type InvoiceLine } from "./summary.ts";

const line = (type: InvoiceLine["type"], fee: number, id = Math.random().toString()): InvoiceLine => ({
  orderId: id,
  deliveredAt: "2026-09-10T12:00:00Z",
  fee,
  type,
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
