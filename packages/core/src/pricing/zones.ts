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

export function defaultZonePrices(settings: PlatformSettingsRow): Record<FixedZone, number> {
  return {
    zone1: Number(settings[DEFAULT_FEE_COLUMN.zone1]),
    zone2: Number(settings[DEFAULT_FEE_COLUMN.zone2]),
    zone3: Number(settings[DEFAULT_FEE_COLUMN.zone3]),
    zone4: Number(settings[DEFAULT_FEE_COLUMN.zone4]),
  };
}

export function resolvePerKm(settings: PlatformSettingsRow, config?: PharmacyDeliveryConfigRow | null): number {
  return config?.remote_per_km != null ? Number(config.remote_per_km) : Number(settings.default_remote_per_km);
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
