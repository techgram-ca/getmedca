import type { ServiceClient } from "@getmed/db/service";
import type {
  DeliveryPriceSource,
  DeliveryZone,
  PharmacyDeliveryConfigRow,
  PlatformSettingsRow,
} from "@getmed/db/types";
import { getPlatformSettings } from "../settings";
import {
  DELIVERY_ZONES,
  FIXED_ZONES,
  REMOTE_ZONE,
  defaultZonePrices,
  remoteQuote,
  resolvePerKm,
  round2,
  toFsa,
  zoneLabel,
  zoneShortLabel,
  type FixedZone,
  type RemoteQuote,
} from "./zones";

export * from "./zones";

export type ResolvedPrice = { price: number; source: "pharmacy" | "default" };
export type PharmacyPricing = Record<FixedZone, ResolvedPrice>;

function merge(defaults: Record<FixedZone, number>, overrides: Partial<Record<FixedZone, number>>): PharmacyPricing {
  return FIXED_ZONES.reduce((acc, zone) => {
    const override = overrides[zone];
    acc[zone] = override != null ? { price: Number(override), source: "pharmacy" } : { price: defaults[zone], source: "default" };
    return acc;
  }, {} as PharmacyPricing);
}

/** Fixed zone prices in effect for one pharmacy, falling back to the defaults. */
export async function resolvePricing(db: ServiceClient, pharmacyId: string, settings?: PlatformSettingsRow): Promise<PharmacyPricing> {
  const s = settings ?? (await getPlatformSettings(db));
  const { data } = await db.from("pharmacy_delivery_pricing").select("delivery_type, price").eq("pharmacy_id", pharmacyId);
  const overrides: Partial<Record<FixedZone, number>> = {};
  for (const row of data ?? []) overrides[row.delivery_type as FixedZone] = Number(row.price);
  return merge(defaultZonePrices(s), overrides);
}

/** Prices for every pharmacy at once, for the admin pricing table. */
export async function resolvePricingForAll(
  db: ServiceClient,
  pharmacyIds: string[],
  settings?: PlatformSettingsRow,
): Promise<Record<string, PharmacyPricing>> {
  const s = settings ?? (await getPlatformSettings(db));
  const defaults = defaultZonePrices(s);
  const out: Record<string, PharmacyPricing> = {};
  if (pharmacyIds.length === 0) return out;

  const { data } = await db.from("pharmacy_delivery_pricing").select("pharmacy_id, delivery_type, price").in("pharmacy_id", pharmacyIds);
  const byPharmacy = new Map<string, Partial<Record<FixedZone, number>>>();
  for (const row of data ?? []) {
    const existing = byPharmacy.get(row.pharmacy_id) ?? {};
    existing[row.delivery_type as FixedZone] = Number(row.price);
    byPharmacy.set(row.pharmacy_id, existing);
  }
  for (const id of pharmacyIds) out[id] = merge(defaults, byPharmacy.get(id) ?? {});
  return out;
}

/** Replace a pharmacy's price overrides. A null price clears one. */
export async function savePharmacyPricing(
  db: ServiceClient,
  pharmacyId: string,
  prices: Partial<Record<FixedZone, number | null>>,
): Promise<void> {
  const toRemove: FixedZone[] = [];
  const toUpsert: { pharmacy_id: string; delivery_type: FixedZone; price: number; updated_at: string }[] = [];
  const now = new Date().toISOString();

  for (const zone of FIXED_ZONES) {
    if (!(zone in prices)) continue;
    const value = prices[zone];
    if (value == null) toRemove.push(zone);
    else toUpsert.push({ pharmacy_id: pharmacyId, delivery_type: zone, price: value, updated_at: now });
  }

  if (toRemove.length) {
    const { error } = await db.from("pharmacy_delivery_pricing").delete().eq("pharmacy_id", pharmacyId).in("delivery_type", toRemove);
    if (error) throw error;
  }
  if (toUpsert.length) {
    const { error } = await db.from("pharmacy_delivery_pricing").upsert(toUpsert, { onConflict: "pharmacy_id,delivery_type" });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------
// Resolving one order's price
// ---------------------------------------------------------------------

export type ZoneResolution =
  | {
      /** The postal code is tagged to a zone for this pharmacy. Final. */
      source: Extract<DeliveryPriceSource, "tagged">;
      zone: FixedZone;
      price: number;
      quote: null;
    }
  | {
      /** Not tagged: priced per km, quoted as a span for an admin to confirm. */
      source: Extract<DeliveryPriceSource, "remote">;
      zone: typeof REMOTE_ZONE;
      price: null;
      quote: RemoteQuote;
    }
  | {
      /** Not tagged and no route to measure — nothing can be worked out. */
      source: Extract<DeliveryPriceSource, "manual">;
      zone: null;
      price: null;
      quote: null;
    };

export type PricingContext = {
  settings: PlatformSettingsRow;
  pricing: PharmacyPricing;
  perKm: number;
  span: number;
  /** Postal areas this pharmacy has tagged, keyed by FSA. */
  taggedZones: Map<string, FixedZone>;
};

/** Everything needed to price this pharmacy's orders, read once. */
export async function loadPricingContext(
  db: ServiceClient,
  pharmacyId: string,
  settings?: PlatformSettingsRow,
): Promise<PricingContext> {
  const s = settings ?? (await getPlatformSettings(db));
  const [pricing, { data: config }, { data: areas }] = await Promise.all([
    resolvePricing(db, pharmacyId, s),
    db.from("pharmacy_delivery_config").select("*").eq("pharmacy_id", pharmacyId).maybeSingle(),
    db.from("pharmacy_zone_areas").select("fsa, zone").eq("pharmacy_id", pharmacyId),
  ]);
  const cfg = (config ?? null) as PharmacyDeliveryConfigRow | null;
  return {
    settings: s,
    pricing,
    perKm: resolvePerKm(s, cfg),
    span: Number(s.remote_quote_span),
    taggedZones: new Map((areas ?? []).map((a) => [a.fsa, a.zone as FixedZone])),
  };
}

/**
 * Prices one delivery. Two rules and nothing between them:
 *
 *  1. The delivery postal code is tagged to a zone for this pharmacy → that
 *     zone's fixed price, settled with nobody touching it.
 *  2. Anything else → Zone 5, per km, quoted as a span an admin confirms.
 *
 * So an untagged postal code always reaches an admin. On a nearby one the
 * per-km price comes out conspicuously low, which is the signal that it
 * belongs in a zone.
 *
 * Distance is the stored toll-free driving distance, never straight-line. With
 * no route to measure there is no per-km price either, and the order is left
 * for an admin to price by hand.
 */
export function resolveZone(
  ctx: PricingContext,
  order: { delivery_postal_code: string | null; delivery_distance_m: number | null },
): ZoneResolution {
  const fsa = toFsa(order.delivery_postal_code);
  const tagged = fsa ? ctx.taggedZones.get(fsa) : undefined;
  if (tagged) {
    return { source: "tagged", zone: tagged, price: ctx.pricing[tagged].price, quote: null };
  }

  if (order.delivery_distance_m == null) {
    return { source: "manual", zone: null, price: null, quote: null };
  }

  const km = Number(order.delivery_distance_m) / 1000;
  return { source: "remote", zone: REMOTE_ZONE, price: null, quote: remoteQuote(km, ctx.perKm, ctx.span) };
}

/** The row patch a resolution writes onto an order. */
export function zonePatch(resolution: ZoneResolution) {
  return {
    delivery_type: resolution.zone as DeliveryZone | null,
    delivery_price_source: resolution.source,
    delivery_fee_charged: resolution.price,
    delivery_quote_min: resolution.quote?.min ?? null,
    delivery_quote_max: resolution.quote?.max ?? null,
    delivery_type_set_at: resolution.price != null ? new Date().toISOString() : null,
  };
}

export { DELIVERY_ZONES, zoneLabel, zoneShortLabel, round2 };
export * from "./areas";
export * from "./parse-areas";
export * from "./quote";
