import { test } from "node:test";
import assert from "node:assert/strict";
import type { PlatformSettingsRow } from "@getmed/db/types";
import { DEFAULT_SETTINGS } from "../settings.ts";
import { resolveZone, type PricingContext } from "./index.ts";
import { remotePrice, resolvePerKm, toFsa } from "./zones.ts";

const settings: PlatformSettingsRow = { ...DEFAULT_SETTINGS };

function ctx(tagged: Record<string, "zone1" | "zone2" | "zone3" | "zone4"> = {}): PricingContext {
  return {
    settings,
    pricing: {
      zone1: { price: 5, source: "default" },
      zone2: { price: 8, source: "default" },
      zone3: { price: 12, source: "default" },
      zone4: { price: 18, source: "default" },
    },
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

test("a tagged postal code takes its zone's price, whatever the distance", () => {
  // Brampton tagged Zone 2 at 22 km, and a Toronto FSA tagged Zone 1 at 3 km —
  // the tag decides in both directions, never the distance.
  const near = resolveZone(ctx({ M5V: "zone1" }), order("M5V 3A8", 3));
  assert.equal(near.source, "tagged");
  assert.equal(near.price, 5);

  const far = resolveZone(ctx({ L6P: "zone2" }), order("L6P 1A1", 22));
  assert.equal(far.source, "tagged");
  assert.equal(far.zone, "zone2");
  assert.equal(far.price, 8);
});

test("an untagged postal code goes straight to Zone 5, however close it is", () => {
  // There is no distance fallback: untagged means per km, and a conspicuously
  // low price is the cue to tag it.
  const near = resolveZone(ctx({ L6P: "zone2" }), order("M5V 3A8", 3));
  assert.equal(near.source, "remote");
  assert.equal(near.zone, "zone5");
  assert.equal(near.price, 3.6, "3 km at $1.20/km");

  const far = resolveZone(ctx(), order("K1A 0A6", 60));
  assert.equal(far.source, "remote");
  assert.equal(far.price, 72);
});

test("a remote order settles its own price, with nobody to confirm it", () => {
  // The whole point of the change: a Zone 5 order is priced on arrival, so it
  // can be assigned and delivered without waiting on an admin.
  const r = resolveZone(ctx(), order("K1A 0A6", 14));
  assert.equal(r.price, 16.8);
  assert.notEqual(r.price, null, "a remote order must never leave here unpriced");
});

test("a remote price never goes negative or carries fractions of a cent", () => {
  assert.equal(remotePrice(0, 1.2), 0);
  assert.equal(remotePrice(-5, 1.2), 0, "a nonsense distance cannot pay the pharmacy");
  assert.equal(remotePrice(9.99, 1.115), 11.14);
});

test("no tag and no distance leaves the order for an admin", () => {
  const r = resolveZone(ctx(), order("K1A 0A6", null));
  assert.equal(r.source, "manual");
  assert.equal(r.zone, null);
  assert.equal(r.price, null);
});

test("a tag still applies when the route could not be measured", () => {
  const r = resolveZone(ctx({ M5V: "zone1" }), order("M5V 3A8", null));
  assert.equal(r.source, "tagged");
  assert.equal(r.price, 5);
});

test("an unparseable postal code cannot match a tag, so it is remote", () => {
  const r = resolveZone(ctx({ M5V: "zone1" }), order("not a postcode", 3));
  assert.equal(r.source, "remote");
});

test("a pharmacy's own per-km rate overrides the platform default", () => {
  const config = { pharmacy_id: "p1", remote_per_km: 2.5, updated_at: "" };
  assert.equal(resolvePerKm(settings, config), 2.5);
  assert.equal(resolvePerKm(settings, null), 1.2);
});

test("every resolvable delivery carries a price, so nothing waits on an admin", () => {
  // The change this file exists to protect: before, a remote order came back
  // priceless and could not be assigned until someone typed an amount.
  const cases = [
    resolveZone(ctx({ M5V: "zone1" }), order("M5V 3A8", 3)),
    resolveZone(ctx(), order("M5V 3A8", 3)),
    resolveZone(ctx(), order("K1A 0A6", 140)),
    resolveZone(ctx(), order(null, 8)),
  ];
  for (const r of cases) {
    assert.notEqual(r.price, null, `${r.source} left the order unpriced`);
  }

  // The one exception, and it is a genuine dead end rather than a handoff:
  // no distance means there is nothing to multiply.
  assert.equal(resolveZone(ctx(), order(null, null)).price, null);
});
