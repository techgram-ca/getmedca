import type { ServiceClient } from "@getmed/db/service";
import type { DeliveryType, PlatformSettingsRow } from "@getmed/db/types";
import { getPlatformSettings } from "../settings";

/** Delivery types the admin can pick from when assigning a driver. */
export const DELIVERY_TYPES = [
  {
    id: "local",
    label: "Local Delivery",
    description: "Close to the pharmacy, within its usual delivery area.",
  },
  {
    id: "gta",
    label: "GTA Delivery",
    description: "Anywhere in the Greater Toronto Area.",
  },
  {
    id: "extended",
    label: "Extended Delivery",
    description: "Beyond the GTA, longer driving distance.",
  },
  {
    id: "custom",
    label: "Custom Delivery",
    description: "One-off price for this order only.",
  },
] as const;

/** The three types that carry a configured price. Custom is priced per order. */
export type PricedDeliveryType = "local" | "gta" | "extended";
export const PRICED_DELIVERY_TYPES: PricedDeliveryType[] = ["local", "gta", "extended"];

export function deliveryTypeLabel(type: DeliveryType | null | undefined): string {
  if (!type) return "Uncategorised";
  return DELIVERY_TYPES.find((t) => t.id === type)?.label ?? type;
}

/** Column on `platform_settings` holding each type's fallback price. */
const DEFAULT_COLUMN = {
  local: "default_local_fee",
  gta: "default_gta_fee",
  extended: "default_extended_fee",
} as const satisfies Record<PricedDeliveryType, keyof PlatformSettingsRow>;

export function defaultPrices(settings: PlatformSettingsRow): Record<PricedDeliveryType, number> {
  return {
    local: Number(settings.default_local_fee),
    gta: Number(settings.default_gta_fee),
    extended: Number(settings.default_extended_fee),
  };
}

export type ResolvedPrice = { price: number; source: "pharmacy" | "default" };
export type PharmacyPricing = Record<PricedDeliveryType, ResolvedPrice>;

function merge(defaults: Record<PricedDeliveryType, number>, overrides: Partial<Record<PricedDeliveryType, number>>): PharmacyPricing {
  return PRICED_DELIVERY_TYPES.reduce((acc, type) => {
    const override = overrides[type];
    acc[type] = override != null ? { price: Number(override), source: "pharmacy" } : { price: defaults[type], source: "default" };
    return acc;
  }, {} as PharmacyPricing);
}

/** Prices in effect for one pharmacy, falling back to the platform defaults. */
export async function resolvePricing(db: ServiceClient, pharmacyId: string, settings?: PlatformSettingsRow): Promise<PharmacyPricing> {
  const s = settings ?? (await getPlatformSettings(db));
  const { data } = await db.from("pharmacy_delivery_pricing").select("delivery_type, price").eq("pharmacy_id", pharmacyId);
  const overrides: Partial<Record<PricedDeliveryType, number>> = {};
  for (const row of data ?? []) overrides[row.delivery_type as PricedDeliveryType] = Number(row.price);
  return merge(defaultPrices(s), overrides);
}

/** Prices for every pharmacy at once, for the admin pricing table. */
export async function resolvePricingForAll(
  db: ServiceClient,
  pharmacyIds: string[],
  settings?: PlatformSettingsRow,
): Promise<Record<string, PharmacyPricing>> {
  const s = settings ?? (await getPlatformSettings(db));
  const defaults = defaultPrices(s);
  const out: Record<string, PharmacyPricing> = {};
  if (pharmacyIds.length === 0) return out;

  const { data } = await db.from("pharmacy_delivery_pricing").select("pharmacy_id, delivery_type, price").in("pharmacy_id", pharmacyIds);
  const byPharmacy = new Map<string, Partial<Record<PricedDeliveryType, number>>>();
  for (const row of data ?? []) {
    const existing = byPharmacy.get(row.pharmacy_id) ?? {};
    existing[row.delivery_type as PricedDeliveryType] = Number(row.price);
    byPharmacy.set(row.pharmacy_id, existing);
  }
  for (const id of pharmacyIds) out[id] = merge(defaults, byPharmacy.get(id) ?? {});
  return out;
}

/** Replace a pharmacy's overrides. A null price clears the override so the default applies again. */
export async function savePharmacyPricing(
  db: ServiceClient,
  pharmacyId: string,
  prices: Partial<Record<PricedDeliveryType, number | null>>,
): Promise<void> {
  const toRemove: PricedDeliveryType[] = [];
  const toUpsert: { pharmacy_id: string; delivery_type: PricedDeliveryType; price: number; updated_at: string }[] = [];
  const now = new Date().toISOString();

  for (const type of PRICED_DELIVERY_TYPES) {
    if (!(type in prices)) continue;
    const value = prices[type];
    if (value == null) toRemove.push(type);
    else toUpsert.push({ pharmacy_id: pharmacyId, delivery_type: type, price: value, updated_at: now });
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

export { DEFAULT_COLUMN };
