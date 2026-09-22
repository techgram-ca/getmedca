import { test } from "node:test";
import assert from "node:assert/strict";
import type { ServiceClient } from "@getmed/db/service";
import { listConsultationPharmacists } from "./listing.ts";
import type { SearchResponse, SearchResult } from "../geo/search";

/**
 * The listing composes a pharmacy search with two follow-up reads. These tests
 * drive it with a stub client so the grouping, the facet counts and the filter
 * are covered without a database or a Mapbox key.
 */
function pharmacy(id: string, name: string, distanceM: number): SearchResult {
  return {
    id, slug: name.toLowerCase(), name, phone: null, addressLine: null, city: "Toronto",
    lat: 43.7, lng: -79.4, logoUrl: null, tagline: null, estimatedDeliveryTime: null,
    offersDelivery: true, offersTransfer: true, offersConsultation: true,
    open: true, openLabel: "Open until 9:00 PM",
    drivingDistanceM: distanceM, drivingDurationS: 600,
  };
}

type Staff = { id: string; pharmacy_id: string; name: string; languages: string[] };

function stubDb(staff: Staff[], prices: { pharmacy_id: string; price: number | null }[]): ServiceClient {
  const table = (name: string) => {
    if (name === "issues") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "issue-1" } }) }) }) };
    }
    if (name === "pharmacists") {
      const rows = staff.map((s) => ({
        ...s, credentials: null, years_experience: null, bio: null, is_main: false, photo_path: null, sort_order: 0,
      }));
      return { select: () => ({ in: () => ({ order: () => ({ order: async () => ({ data: rows }) }) }) }) };
    }
    if (name === "pharmacy_issues") {
      return { select: () => ({ eq: () => ({ in: async () => ({ data: prices }) }) }) };
    }
    throw new Error(`unexpected table ${name}`);
  };
  return { from: table } as unknown as ServiceClient;
}

/** Injects a canned search so the test never needs Mapbox or PostGIS. */
function listWith(
  search: SearchResponse,
  staff: Staff[],
  prices: { pharmacy_id: string; price: number | null }[],
  language?: string | null,
) {
  return listConsultationPharmacists(
    stubDb(staff, prices),
    { issueSlug: "uti", address: "Toronto", language },
    async () => search,
  );
}

const origin = { lat: 43.7, lng: -79.4, placeName: "Toronto" };

test("one card per pharmacist, nearest pharmacy first", async () => {
  const listing = await listWith(
    { origin, radiusKm: 10, results: [pharmacy("p1", "Near", 1000), pharmacy("p2", "Far", 5000)] },
    [
      { id: "s1", pharmacy_id: "p1", name: "Amrit", languages: ["English", "Punjabi"] },
      { id: "s2", pharmacy_id: "p1", name: "Wei", languages: ["English", "Mandarin"] },
      { id: "s3", pharmacy_id: "p2", name: "Claire", languages: ["French"] },
    ],
    [{ pharmacy_id: "p1", price: 25 }],
  );
  assert.deepEqual(listing.results.map((r) => r.name), ["Amrit", "Wei", "Claire"]);
  assert.equal(listing.results[0]!.price, 25);
  assert.equal(listing.results[2]!.price, null, "a pharmacy with no price row charges no fee");
});

test("a pharmacy with nobody on file still appears", async () => {
  const listing = await listWith(
    { origin, radiusKm: 10, results: [pharmacy("p1", "Solo", 1000)] },
    [],
    [],
  );
  assert.equal(listing.results.length, 1);
  assert.equal(listing.results[0]!.pharmacistId, null);
  assert.equal(listing.results[0]!.name, "Solo");
});

test("language facets count pharmacists, not pharmacies", async () => {
  const listing = await listWith(
    { origin, radiusKm: 10, results: [pharmacy("p1", "Near", 1000), pharmacy("p2", "Far", 5000)] },
    [
      { id: "s1", pharmacy_id: "p1", name: "Amrit", languages: ["English", "Punjabi"] },
      { id: "s2", pharmacy_id: "p1", name: "Wei", languages: ["english"] },
      { id: "s3", pharmacy_id: "p2", name: "Claire", languages: ["French"] },
    ],
    [],
  );
  const english = listing.languages.find((l) => l.value === "english")!;
  assert.equal(english.count, 2, "different spellings of the same language must not split the facet");
  assert.equal(listing.languages.find((l) => l.value === "french")!.count, 1);
  assert.deepEqual(listing.languages.map((l) => l.value), ["english", "french", "punjabi"]);
});

test("filtering by language keeps the facets and reports what was hidden", async () => {
  const listing = await listWith(
    { origin, radiusKm: 10, results: [pharmacy("p1", "Near", 1000), pharmacy("p2", "Far", 5000)] },
    [
      { id: "s1", pharmacy_id: "p1", name: "Amrit", languages: ["English", "Punjabi"] },
      { id: "s2", pharmacy_id: "p1", name: "Wei", languages: ["Mandarin"] },
      { id: "s3", pharmacy_id: "p2", name: "Claire", languages: ["French"] },
    ],
    [],
    "PUNJABI",
  );
  assert.deepEqual(listing.results.map((r) => r.name), ["Amrit"], "matching is case-insensitive");
  assert.equal(listing.filteredOut, 2);
  assert.equal(listing.languages.length, 4, "the filter still shows every option it filters between");
});

test("no pharmacies nearby yields an empty listing, not a crash", async () => {
  const listing = await listWith({ origin, radiusKm: 10, results: [] }, [], []);
  assert.deepEqual(listing.results, []);
  assert.deepEqual(listing.languages, []);
  assert.equal(listing.filteredOut, 0);
});
