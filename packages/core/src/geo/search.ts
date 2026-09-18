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
  radiusKm: number;
  results: SearchResult[];
};

const PREFILTER_MULTIPLIER = 1.8; // generous straight-line buffer (spec §5 stage 2)
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(origin: LngLat, ids: string[]): string {
  const lat = origin.lat.toFixed(3);
  const lng = origin.lng.toFixed(3);
  return `matrix:${lat},${lng}:${[...ids].sort().join(",")}`;
}

/**
 * Two-stage discovery (spec §5):
 *  1. geocode, 2. PostGIS pre-filter (1.8× radius), 3. batched Matrix call (cached),
 *  4. filter by ADMIN radius on real driving distance, 5. sort by driving distance.
 */
export async function searchPharmacies(
  db: ServiceClient,
  input: { address?: string; lat?: number; lng?: number; issueSlug?: string | null },
): Promise<SearchResponse> {
  const settings = await getPlatformSettings(db);
  const radiusKm = Number(settings.search_radius_km);

  let origin: (LngLat & { placeName: string }) | null = null;
  if (typeof input.lat === "number" && typeof input.lng === "number") {
    origin = { lat: input.lat, lng: input.lng, placeName: input.address ?? "Your location" };
  } else if (input.address) {
    const g = await geocode(input.address);
    if (g) origin = { lat: g.lat, lng: g.lng, placeName: g.placeName };
  }
  if (!origin) return { origin: null, radiusKm, results: [] };

  const { data: nearby, error } = await db.rpc("pharmacies_near", {
    p_lat: origin.lat,
    p_lng: origin.lng,
    p_radius_m: radiusKm * 1000 * PREFILTER_MULTIPLIER,
    p_issue_slug: input.issueSlug ?? null,
  });
  if (error) throw error;
  const rows = (nearby ?? []) as PharmacyNearRow[];
  if (rows.length === 0) return { origin, radiusKm, results: [] };

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
    if (distance > radiusKm * 1000) continue;
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
  return { origin, radiusKm, results };
}

/** Driving distance from an address to ONE pharmacy (used on /p/[slug] when ?address= is present). */
export async function distanceToPharmacy(address: string, pharmacy: LngLat) {
  const g = await geocode(address);
  if (!g) return null;
  const [m] = await drivingMatrix(g, [pharmacy]);
  return m ?? null;
}
