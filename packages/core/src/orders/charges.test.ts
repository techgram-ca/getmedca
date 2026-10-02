import { test } from "node:test";
import assert from "node:assert/strict";
import type { ServiceClient } from "@getmed/db/service";
import type { OrderRow } from "@getmed/db/types";
import { chargeDelivery, chargeFailedDelivery, chargeRefrigeration } from "./charges.ts";

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
  ({ id: "o1", pharmacy_id: "p1", delivery_fee_charged: fee, delivery_type: "zone1", delivery_attempt: attempt }) as OrderRow;

test("a completed delivery bills the full quoted fee", async () => {
  const { db, rows } = stubDb(100);
  assert.equal(await chargeDelivery(db, order(8)), 8);
  assert.deepEqual(rows[0], { order_id: "o1", pharmacy_id: "p1", kind: "delivery", amount: 8, delivery_type: "zone1", attempt: 1 });
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

/** chargeRefrigeration reads the fee through the pricing context. */
function fridgeDb(defaultFee: number, pharmacyFee: number | null) {
  const rows: Recorded[] = [];
  const db = {
    from(table: string) {
      if (table === "platform_settings") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { default_refrigeration_fee: defaultFee, default_remote_per_km: 1.2, remote_quote_span: 6, default_zone1_fee: 5, default_zone2_fee: 8, default_zone3_fee: 12, default_zone4_fee: 18 } }) }) }) };
      }
      if (table === "pharmacy_delivery_pricing") return { select: () => ({ eq: async () => ({ data: [] }) }) };
      if (table === "pharmacy_delivery_config") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: pharmacyFee == null ? null : { pharmacy_id: "p1", remote_per_km: null, refrigeration_fee: pharmacyFee } }) }) }) };
      }
      if (table === "pharmacy_zone_areas") return { select: () => ({ eq: async () => ({ data: [] }) }) };
      if (table === "order_charges") {
        return { upsert: async (row: Recorded) => { rows.push(row); return { error: null }; } };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ServiceClient;
  return { db, rows };
}

const cold = (requires: boolean) =>
  ({ id: "o1", pharmacy_id: "p1", delivery_fee_charged: 8, delivery_type: "zone1", delivery_attempt: 1, requires_refrigeration: requires }) as OrderRow;

test("a cold-chain delivery bills the refrigeration fee on its own line", async () => {
  const { db, rows } = fridgeDb(4, null);
  assert.equal(await chargeRefrigeration(db, cold(true)), 4);
  assert.deepEqual(rows.map((r) => r.kind), ["refrigeration"], "must not touch the delivery charge");
});

test("the pharmacy's own fee wins over the platform default", async () => {
  const { db } = fridgeDb(4, 9.5);
  assert.equal(await chargeRefrigeration(db, cold(true)), 9.5);
});

test("an order that is not cold-chain bills nothing, whatever the fee", async () => {
  const { db, rows } = fridgeDb(4, null);
  assert.equal(await chargeRefrigeration(db, cold(false)), 0);
  assert.equal(rows.length, 0);
});

test("a fee of zero records no charge, so invoices carry no $0.00 noise", async () => {
  // Zero is a real setting: the pharmacy is still asked, the driver is still
  // told, and nothing is billed.
  const { db, rows } = fridgeDb(0, null);
  assert.equal(await chargeRefrigeration(db, cold(true)), 0);
  assert.equal(rows.length, 0);

  // And a pharmacy override of zero beats a non-zero default the same way.
  const over = fridgeDb(4, 0);
  assert.equal(await chargeRefrigeration(over.db, cold(true)), 0);
  assert.equal(over.rows.length, 0);
});
