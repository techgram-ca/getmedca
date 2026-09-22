import { test } from "node:test";
import assert from "node:assert/strict";
import { DELIVERY_TYPES, PRICED_DELIVERY_TYPES, defaultPrices, deliveryTypeLabel } from "./index.ts";

test("custom is offered but carries no configured price", () => {
  assert.equal(DELIVERY_TYPES.length, 4);
  assert.equal(PRICED_DELIVERY_TYPES.includes("custom" as never), false);
  assert.deepEqual(PRICED_DELIVERY_TYPES, ["local", "gta", "extended"]);
});

test("labels cover every type and fall back for missing ones", () => {
  assert.equal(deliveryTypeLabel("local"), "Local Delivery");
  assert.equal(deliveryTypeLabel("gta"), "GTA Delivery");
  assert.equal(deliveryTypeLabel("extended"), "Extended Delivery");
  assert.equal(deliveryTypeLabel("custom"), "Custom Delivery");
  assert.equal(deliveryTypeLabel(null), "Uncategorised");
});

test("defaults are read as numbers even when the driver returns strings", () => {
  const prices = defaultPrices({
    id: 1,
    search_radius_km: 10,
    sla_minutes: 30,
    default_local_fee: "4.50" as unknown as number,
    default_gta_fee: 8,
    default_extended_fee: 12,
    updated_at: "",
  });
  assert.deepEqual(prices, { local: 4.5, gta: 8, extended: 12 });
});
