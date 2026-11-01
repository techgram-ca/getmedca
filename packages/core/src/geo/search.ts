import type { ServiceClient } from "@getmed/db/service";
import type { PharmacyNearRow } from "@getmed/db/types";
import { getPlatformSettings } from "../settings";
import { mediaUrl } from "../storage";
import { isOpenNow } from "../hours";
import { drivingMatrix, geocode, type LngLat } from "./mapbox";

export type SearchResult = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  lat: number;
  lng: number;
  logoUrl: string | null;
  tagline: string | null;
  estimatedDeliveryTime: string | null;
  offersDelivery: boolean;
  offersTransfer: boolean;
  offersConsultation: boolean;
  open: boolean;
  openLabel: string;
  drivingDistanceM: number | null;
  drivingDurationS: number | null;
};

export type SearchResponse = {
  origin: (LngLat & { placeName: string }) | null;
  /** How many the admin asked for. The results may be fewer; never more. */
  limit: number;
  results: SearchResult[];
};

/**
 * How far out to look at all.
 *
 * Not a setting, because it is not a product decision — it is the line past
 * which "your nearest pharmacy" stops being a useful answer. Without it an
 * address in Thunder Bay is offered a Toronto pharmacy with 1,400 km printed
 * beside it, which is worse than being told there is nothing nearby.
 */
const MAX_SEARCH_KM = 100;

/**
 * Candidates to fetch per result wanted.
 *
 * The database orders by straight line and the patient sees road distance,
 * and those disagree — the pharmacy across the ravine is nearer as the crow
 * flies and further to drive. Fetching a surplus means the reorder has
 * something to promote rather than just shuffling a list that was already
 * cut to length.
 */
const CANDIDATE_FACTOR = 3;

const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(origin: LngLat, ids: string[]): string {
  const lat = origin.lat.toFixed(3);
  const lng = origin.lng.toFixed(3);
  return `matrix:${lat},${lng}:${[...ids].sort().join(",")}`;
}

/**
 * The nearest handful of pharmacies to an address.
 *
 * Four stages: geocode, take a surplus of candidates from PostGIS by straight
 * line, get real driving distances for them in one batched Matrix call, then
 * sort by road and cut to the number the admin asked for.
 *
 * A count rather than a radius, because a radius answers the wrong question:
 * ten kilometres is thirty pharmacies downtown and none in the country, and
 * the patient wants a short list either way. Nothing is dropped for being
 * far — if the nearest is the only one, it is still the answer.
 */
export async function searchPharmacies(
  db: ServiceClient,
  input: { address?: string; lat?: number; lng?: number; issueSlug?: string | null },
): Promise<SearchResponse> {
  const settings = await getPlatformSettings(db);
  const limit = Math.max(1, Math.round(Number(settings.search_result_limit) || 10));

  let origin: (LngLat & { placeName: string }) | null = null;
  if (typeof input.lat === "number" && typeof input.lng === "number") {
    origin = { lat: input.lat, lng: input.lng, placeName: input.address ?? "Your location" };
  } else if (input.address) {
    const g = await geocode(input.address);
    if (g) origin = { lat: g.lat, lng: g.lng, placeName: g.placeName };
  }
  if (!origin) return { origin: null, limit, results: [] };

  const { data: nearby, error } = await db.rpc("pharmacies_near", {
    p_lat: origin.lat,
    p_lng: origin.lng,
    p_radius_m: MAX_SEARCH_KM * 1000,
    p_limit: limit * CANDIDATE_FACTOR,
    p_issue_slug: input.issueSlug ?? null,
  });
  if (error) throw error;
  const rows = (nearby ?? []) as PharmacyNearRow[];
  if (rows.length === 0) return { origin, limit, results: [] };

  // Stage 3 with short-lived cache keyed by rounded coords + pharmacy set.
  const key = cacheKey(origin, rows.map((r) => r.id));
  let matrix: { distanceM: number | null; durationS: number | null }[] | null = null;
  const { data: cached } = await db.from("search_cache").select("payload, expires_at").eq("key", key).maybeSingle();
  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    matrix = cached.payload as typeof matrix;
  }
  if (!matrix) {
    matrix = await drivingMatrix(origin, rows.map((r) => ({ lat: r.lat, lng: r.lng })));
    await db.from("search_cache").upsert({ key, payload: matrix, expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString() });
  }

  const results: SearchResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const m = matrix[i] ?? { distanceM: null, durationS: null };
    // Fallback to straight-line when the Matrix API can't route (keeps the pharmacy discoverable).
    const distance = m.distanceM ?? r.straight_line_m;
    const open = isOpenNow(r.hours);
    results.push({
      id: r.id,
      slug: r.slug ?? r.id,
      name: r.name ?? "Pharmacy",
      phone: r.phone,
      addressLine: r.address_line,
      city: r.city,
      lat: r.lat,
      lng: r.lng,
      logoUrl: await mediaUrl(db, r.logo_path),
      tagline: r.tagline,
      estimatedDeliveryTime: r.estimated_delivery_time,
      offersDelivery: r.offers_delivery,
      offersTransfer: r.offers_transfer,
      offersConsultation: r.offers_consultation,
      open: open.open,
      openLabel: open.label,
      drivingDistanceM: distance,
      drivingDurationS: m.durationS,
    });
  }
  results.sort((a, b) => (a.drivingDistanceM ?? Infinity) - (b.drivingDistanceM ?? Infinity));
  // Cut only now: the surplus existed so that the road ordering could promote
  // something the straight-line ordering had further down.
  return { origin, limit, results: results.slice(0, limit) };
}

/** Driving distance from an address to ONE pharmacy (used on /p/[slug] when ?address= is present). */
export async function distanceToPharmacy(address: string, pharmacy: LngLat) {
  const g = await geocode(address);
  if (!g) return null;
  const [m] = await drivingMatrix(g, [pharmacy]);
  return m ?? null;
}
