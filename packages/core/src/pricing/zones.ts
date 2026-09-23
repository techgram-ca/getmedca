import type { DeliveryZone, PharmacyDeliveryConfigRow, PlatformSettingsRow } from "@getmed/db/types";

/** The five delivery zones, in the order they are shown everywhere. */
export const DELIVERY_ZONES = [
  { id: "zone1", label: "Zone 1 · Local", short: "Zone 1", description: "Closest to the pharmacy." },
  { id: "zone2", label: "Zone 2 · Nearby", short: "Zone 2", description: "A short drive out." },
  { id: "zone3", label: "Zone 3 · Regional", short: "Zone 3", description: "Across the region." },
  { id: "zone4", label: "Zone 4 · Extended", short: "Zone 4", description: "The far edge of the service area." },
  { id: "zone5", label: "Zone 5 · Remote", short: "Zone 5", description: "Beyond the fixed zones — priced per kilometre." },
] as const;

/** Zones 1-4 carry a fixed price. Zone 5 is worked out per order from distance. */
export type FixedZone = "zone1" | "zone2" | "zone3" | "zone4";
export const FIXED_ZONES: FixedZone[] = ["zone1", "zone2", "zone3", "zone4"];
export const REMOTE_ZONE = "zone5" as const;

export function zoneLabel(zone: DeliveryZone | null | undefined): string {
  if (!zone) return "Not set";
  return DELIVERY_ZONES.find((z) => z.id === zone)?.label ?? zone;
}

export function zoneShortLabel(zone: DeliveryZone | null | undefined): string {
  if (!zone) return "—";
  return DELIVERY_ZONES.find((z) => z.id === zone)?.short ?? zone;
}

const DEFAULT_FEE_COLUMN = {
  zone1: "default_zone1_fee",
  zone2: "default_zone2_fee",
  zone3: "default_zone3_fee",
  zone4: "default_zone4_fee",
} as const satisfies Record<FixedZone, keyof PlatformSettingsRow>;

const BAND_COLUMN = {
  zone1: "zone1_max_km",
  zone2: "zone2_max_km",
  zone3: "zone3_max_km",
  zone4: "zone4_max_km",
} as const satisfies Record<FixedZone, keyof PlatformSettingsRow>;

export function defaultZonePrices(settings: PlatformSettingsRow): Record<FixedZone, number> {
  return {
    zone1: Number(settings[DEFAULT_FEE_COLUMN.zone1]),
    zone2: Number(settings[DEFAULT_FEE_COLUMN.zone2]),
    zone3: Number(settings[DEFAULT_FEE_COLUMN.zone3]),
    zone4: Number(settings[DEFAULT_FEE_COLUMN.zone4]),
  };
}

/**
 * The distance bands in effect for one pharmacy, as kilometre upper bounds.
 * Each entry is exclusive: a delivery at exactly `zone1` km is Zone 2.
 */
export type DistanceBands = Record<FixedZone, number>;

export function resolveBands(settings: PlatformSettingsRow, config?: PharmacyDeliveryConfigRow | null): DistanceBands {
  const pick = (zone: FixedZone) => {
    const override = config?.[BAND_COLUMN[zone]];
    return override != null ? Number(override) : Number(settings[BAND_COLUMN[zone]]);
  };
  return { zone1: pick("zone1"), zone2: pick("zone2"), zone3: pick("zone3"), zone4: pick("zone4") };
}

export function resolvePerKm(settings: PlatformSettingsRow, config?: PharmacyDeliveryConfigRow | null): number {
  return config?.remote_per_km != null ? Number(config.remote_per_km) : Number(settings.default_remote_per_km);
}

/**
 * Which zone a distance falls into. Bounds are lower-inclusive and
 * upper-exclusive, so exactly 6.0 km with a 6 km band is Zone 2, not Zone 1.
 * Beyond the last band there is no fixed zone — the caller prices per km.
 */
export function zoneForDistance(distanceKm: number, bands: DistanceBands): FixedZone | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  for (const zone of FIXED_ZONES) {
    if (distanceKm < bands[zone]) return zone;
  }
  return null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type RemoteQuote = { computed: number; min: number; max: number };

/**
 * A Zone 5 quote. The bottom of the span is the per-km price itself, so an
 * admin who simply confirms charges exactly the configured rate; the span only
 * gives room to go *up* for a run that turns out to be harder than the distance
 * suggests. Floored at zero so a very short remote run cannot quote negative.
 */
export function remoteQuote(distanceKm: number, perKm: number, span: number): RemoteQuote {
  const computed = Math.max(0, round2(distanceKm * perKm));
  return { computed, min: computed, max: round2(computed + Math.max(0, span)) };
}

/** Normalises a postal code to its forward sortation area: "m5v 3a8" → "M5V". */
export function toFsa(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  const cleaned = postalCode.replace(/\s+/g, "").toUpperCase();
  const fsa = cleaned.slice(0, 3);
  return /^[A-Z][0-9][A-Z]$/.test(fsa) ? fsa : null;
}
