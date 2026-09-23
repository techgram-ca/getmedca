import { test } from "node:test";
import assert from "node:assert/strict";
import { DELIVERY_ZONES, FIXED_ZONES, defaultZonePrices, zoneLabel } from "./index.ts";

test("Zone 5 is offered but carries no configured price", () => {
  assert.equal(DELIVERY_ZONES.length, 5);
  assert.equal(FIXED_ZONES.includes("zone5" as never), false, "Zone 5 is priced per km, never from a fixed table");
  assert.deepEqual(FIXED_ZONES, ["zone1", "zone2", "zone3", "zone4"]);
});

test("labels cover every zone and fall back for missing ones", () => {
  assert.equal(zoneLabel("zone1"), "Zone 1 · Local");
  assert.equal(zoneLabel("zone2"), "Zone 2 · Nearby");
  assert.equal(zoneLabel("zone3"), "Zone 3 · Regional");
  assert.equal(zoneLabel("zone4"), "Zone 4 · Extended");
  assert.equal(zoneLabel("zone5"), "Zone 5 · Remote");
  assert.equal(zoneLabel(null), "Not set");
});

test("defaults are read as numbers even when the driver returns strings", () => {
  const prices = defaultZonePrices({
    id: 1,
    search_radius_km: 10,
    sla_minutes: 30,
    default_zone1_fee: "4.50" as unknown as number,
    default_zone2_fee: 8,
    default_zone3_fee: 12,
    default_zone4_fee: 18,
    default_remote_per_km: 1.2,
    zone1_max_km: 6,
    zone2_max_km: 13,
    zone3_max_km: 25,
    zone4_max_km: 50,
    remote_quote_span: 6,
    failed_delivery_fee_percent: 100,
    updated_at: "",
  });
  assert.deepEqual(prices, { zone1: 4.5, zone2: 8, zone3: 12, zone4: 18 });
});
