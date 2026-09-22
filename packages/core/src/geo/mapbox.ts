import { ONTARIO_BBOX } from "./ontario";

export type LngLat = { lng: number; lat: number };
export type GeocodeResult = LngLat & { placeName: string; postalCode?: string; city?: string };

function token(): string {
  const t = process.env.MAPBOX_SERVER_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!t) throw new Error("Mapbox token is not configured");
  return t;
}

/** Mapbox Geocoding API (v6, forward), restricted to Canada + Ontario bbox. */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: address,
    country: "ca",
    bbox: ONTARIO_BBOX.join(","),
    limit: "1",
    access_token: token(),
  });
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { next: { revalidate: 3600 } } as RequestInit);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    features?: {
      geometry: { coordinates: [number, number] };
      properties: { full_address?: string; name?: string; context?: { postcode?: { name: string }; place?: { name: string } } };
    }[];
  };
  const f = json.features?.[0];
  if (!f) return null;
  return {
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    placeName: f.properties.full_address ?? f.properties.name ?? address,
    postalCode: f.properties.context?.postcode?.name,
    city: f.properties.context?.place?.name,
  };
}

export type MatrixEntry = { distanceM: number | null; durationS: number | null };

/**
 * Mapbox Matrix API: ONE batched call, origin → all destinations, returning
 * real driving distance + duration. Max 25 coordinates per request for the
 * driving profile, so we chunk at 24 destinations.
 */
export async function drivingMatrix(origin: LngLat, destinations: LngLat[]): Promise<MatrixEntry[]> {
  if (destinations.length === 0) return [];
  const CHUNK = 24;
  const out: MatrixEntry[] = [];
  for (let i = 0; i < destinations.length; i += CHUNK) {
    const chunk = destinations.slice(i, i + CHUNK);
    const coords = [origin, ...chunk].map((c) => `${c.lng},${c.lat}`).join(";");
    const params = new URLSearchParams({
      sources: "0",
      annotations: "distance,duration",
      access_token: token(),
    });
    const res = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}?${params}`);
    if (!res.ok) {
      out.push(...chunk.map(() => ({ distanceM: null, durationS: null })));
      continue;
    }
    const json = (await res.json()) as { distances?: (number | null)[][]; durations?: (number | null)[][] };
    const d = json.distances?.[0] ?? [];
    const t = json.durations?.[0] ?? [];
    chunk.forEach((_, idx) => out.push({ distanceM: d[idx + 1] ?? null, durationS: t[idx + 1] ?? null }));
  }
  return out;
}

export type DrivingRoute = { distanceM: number; durationS: number; avoidsTolls: boolean };

/**
 * Car-drivable route between two points via the Mapbox Directions API.
 *
 * Toll roads are excluded by default. Where no toll-free route exists the
 * normal driving route is returned with `avoidsTolls: false`, so a distance is
 * still available and the caller can say the route uses a toll road rather
 * than presenting a misleading number.
 */
export async function drivingRoute(origin: LngLat, destination: LngLat): Promise<DrivingRoute | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const request = async (excludeTolls: boolean) => {
    const params = new URLSearchParams({
      overview: "false",
      alternatives: "false",
      geometries: "geojson",
      access_token: token(),
    });
    if (excludeTolls) params.set("exclude", "toll");
    const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; routes?: { distance: number; duration: number }[] };
    if (json.code !== "Ok") return null;
    const route = json.routes?.[0];
    return route ? { distanceM: route.distance, durationS: route.duration } : null;
  };

  try {
    const tollFree = await request(true);
    if (tollFree) return { ...tollFree, avoidsTolls: true };
    const anyRoute = await request(false);
    return anyRoute ? { ...anyRoute, avoidsTolls: false } : null;
  } catch (err) {
    console.error("[mapbox] directions lookup failed", err instanceof Error ? err.message : err);
    return null;
  }
}
