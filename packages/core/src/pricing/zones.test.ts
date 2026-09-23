import { test } from "node:test";
import assert from "node:assert/strict";
import type { PlatformSettingsRow } from "@getmed/db/types";
import { DEFAULT_SETTINGS } from "../settings.ts";
import { resolveZone, type PricingContext } from "./index.ts";
import { remoteQuote, resolveBands, resolvePerKm, toFsa, zoneForDistance } from "./zones.ts";

const settings: PlatformSettingsRow = { ...DEFAULT_SETTINGS };
const bands = resolveBands(settings, null);

function ctx(tagged: Record<string, "zone1" | "zone2" | "zone3" | "zone4"> = {}): PricingContext {
  return {
    settings,
    pricing: {
      zone1: { price: 5, source: "default" },
      zone2: { price: 8, source: "default" },
      zone3: { price: 12, source: "default" },
      zone4: { price: 18, source: "default" },
    },
    bands,
    perKm: 1.2,
    span: 6,
    taggedZones: new Map(Object.entries(tagged) as [string, "zone1"][]),
  };
}

const order = (postal: string | null, km: number | null) => ({
  delivery_postal_code: postal,
  delivery_distance_m: km == null ? null : km * 1000,
});

test("a postal code is reduced to its FSA, whatever the patient typed", () => {
  assert.equal(toFsa("M5V 3A8"), "M5V");
  assert.equal(toFsa("m5v3a8"), "M5V");
  assert.equal(toFsa("  l6p 1a1 "), "L6P");
  for (const bad of [null, "", "M5", "5MV 3A8", "ABCDEF"]) assert.equal(toFsa(bad), null, `${bad} should not parse`);
});

test("bands are lower-inclusive and upper-exclusive", () => {
  // Defaults are 6 / 13 / 25 / 50 km.
  assert.equal(zoneForDistance(0, bands), "zone1");
  assert.equal(zoneForDistance(5.99, bands), "zone1");
  assert.equal(zoneForDistance(6, bands), "zone2", "exactly 6 km is Zone 2, not Zone 1");
  assert.equal(zoneForDistance(12.99, bands), "zone2");
  assert.equal(zoneForDistance(13, bands), "zone3");
  assert.equal(zoneForDistance(24.99, bands), "zone3");
  assert.equal(zoneForDistance(25, bands), "zone4");
  assert.equal(zoneForDistance(49.99, bands), "zone4");
  assert.equal(zoneForDistance(50, bands), null, "beyond the last band there is no fixed zone");
  assert.equal(zoneForDistance(500, bands), null);
});

test("a tagged postal code wins over the distance it actually is", () => {
  // Brampton tagged Zone 2 even though 22 km would band it into Zone 3. That is
  // the whole point of tagging: the pharmacy was promised a price for that city.
  const r = resolveZone(ctx({ L6P: "zone2" }), order("L6P 1A1", 22));
  assert.equal(r.source, "tagged");
  assert.equal(r.zone, "zone2");
  assert.equal(r.price, 8);
  assert.equal(r.quote, null);
});

test("an untagged postal code falls to the distance band", () => {
  const r = resolveZone(ctx({ L6P: "zone2" }), order("M5V 3A8", 22));
  assert.equal(r.source, "band");
  assert.equal(r.zone, "zone3");
  assert.equal(r.price, 12);
});

test("beyond the last band it is Zone 5, quoted as a span", () => {
  const r = resolveZone(ctx(), order("K1A 0A6", 60));
  assert.equal(r.source, "remote");
  assert.equal(r.zone, "zone5");
  assert.equal(r.price, null, "a remote order has no price until an admin confirms one");
  // 60 km x $1.20 = $72.00, span $72.00-$78.00.
  assert.deepEqual(r.quote, { computed: 72, min: 72, max: 78 });
});

test("the bottom of a remote span is the per-km price itself", () => {
  // Confirming without touching the box charges exactly the configured rate.
  const q = remoteQuote(14, 1.2, 6);
  assert.equal(q.computed, 16.8);
  assert.equal(q.min, 16.8, "confirming the default must not undercharge");
  assert.equal(q.max, 22.8);
});

test("a remote quote never goes negative or carries fractions of a cent", () => {
  assert.deepEqual(remoteQuote(0, 1.2, 6), { computed: 0, min: 0, max: 6 });
  assert.equal(remoteQuote(9.99, 1.115, 6).computed, 11.14);
});

test("no distance and no tag leaves the order for an admin", () => {
  const r = resolveZone(ctx(), order("K1A 0A6", null));
  assert.equal(r.source, "manual");
  assert.equal(r.zone, null);
  assert.equal(r.price, null);
  assert.equal(r.quote, null);
});

test("a tag still applies when the route could not be measured", () => {
  const r = resolveZone(ctx({ M5V: "zone1" }), order("M5V 3A8", null));
  assert.equal(r.source, "tagged");
  assert.equal(r.price, 5);
});

test("an unparseable postal code cannot match a tag, but distance still prices it", () => {
  const r = resolveZone(ctx({ M5V: "zone1" }), order("not a postcode", 3));
  assert.equal(r.source, "band");
  assert.equal(r.zone, "zone1");
});

test("per-pharmacy bands and rate override the platform defaults", () => {
  const config = {
    pharmacy_id: "p1",
    remote_per_km: 2.5,
    zone1_max_km: 3,
    zone2_max_km: 8,
    zone3_max_km: null,
    zone4_max_km: null,
    updated_at: "",
  };
  const custom = resolveBands(settings, config);
  assert.deepEqual(custom, { zone1: 3, zone2: 8, zone3: 25, zone4: 50 }, "unset bands fall back to the defaults");
  assert.equal(zoneForDistance(5, custom), "zone2", "5 km is Zone 2 for this pharmacy, Zone 1 by default");
  assert.equal(resolvePerKm(settings, config), 2.5);
  assert.equal(resolvePerKm(settings, null), 1.2);
});
