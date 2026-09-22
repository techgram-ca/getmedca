import { test } from "node:test";
import assert from "node:assert/strict";
import type { ServiceClient } from "@getmed/db/service";
import type { OrderRow } from "@getmed/db/types";
import { chargeDelivery, chargeFailedDelivery } from "./charges.ts";

type Recorded = { kind: string; amount: number; attempt: number; delivery_type: string | null };

/** Captures what would be written to order_charges, with a settings row to read. */
function stubDb(failedPercent: number) {
  const rows: Recorded[] = [];
  const db = {
    from(table: string) {
      if (table === "platform_settings") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { failed_delivery_fee_percent: failedPercent } }) }),
          }),
        };
      }
      if (table === "order_charges") {
        return {
          upsert: async (row: Recorded) => {
            rows.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ServiceClient;
  return { db, rows };
}

const order = (fee: number | null, attempt = 1) =>
  ({ id: "o1", pharmacy_id: "p1", delivery_fee_charged: fee, delivery_type: "local", delivery_attempt: attempt }) as OrderRow;

test("a completed delivery bills the full quoted fee", async () => {
  const { db, rows } = stubDb(100);
  assert.equal(await chargeDelivery(db, order(8)), 8);
  assert.deepEqual(rows[0], { order_id: "o1", pharmacy_id: "p1", kind: "delivery", amount: 8, delivery_type: "local", attempt: 1 });
});

test("a failed attempt bills the admin's share of the quoted fee", async () => {
  const { db, rows } = stubDb(50);
  assert.equal(await chargeFailedDelivery(db, order(8)), 4);
  assert.equal(rows[0]!.kind, "failed_delivery");
  assert.equal(rows[0]!.amount, 4);
});

test("the failed share rounds to cents rather than carrying fractions", async () => {
  const { db } = stubDb(33);
  assert.equal(await chargeFailedDelivery(db, order(9.99)), 3.3);
});

test("at 0% a failed attempt records nothing, so invoices carry no $0.00 rows", async () => {
  const { db, rows } = stubDb(0);
  assert.equal(await chargeFailedDelivery(db, order(8)), 0);
  assert.equal(rows.length, 0);
});

test("an order with no quoted fee is not billed for failing", async () => {
  const { db, rows } = stubDb(100);
  assert.equal(await chargeFailedDelivery(db, order(null)), 0);
  assert.equal(rows.length, 0);
});

test("each attempt is billed under its own attempt number", async () => {
  const { db, rows } = stubDb(100);
  await chargeFailedDelivery(db, order(8, 1));
  await chargeDelivery(db, order(8, 2));
  assert.deepEqual(rows.map((r) => [r.kind, r.attempt]), [["failed_delivery", 1], ["delivery", 2]]);
});
