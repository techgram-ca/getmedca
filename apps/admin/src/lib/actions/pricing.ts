"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { FIXED_ZONES, savePharmacyDeliveryConfig, savePharmacyPricing, saveZoneAreas, type FixedZone } from "@getmed/core/pricing";
import { optionalNumberField, requiredNumberField } from "@getmed/core/validation";
import { updatePlatformSettings } from "@getmed/core/settings";

export type PricingResult = { ok: true } | { ok: false; error: string };

const PRICE_HINT = "Enter a price, for example 7.50";
const km = requiredNumberField(z.number().min(0.1, "Must be above 0").max(2000, "That distance looks too high"), "Enter a distance in kilometres");
const range = z.number().min(0, "Price cannot be negative").max(1000, "That price looks too high");
const money = requiredNumberField(range, PRICE_HINT);

const percent = requiredNumberField(
  z.number().min(0, "Cannot be below 0%").max(100, "Cannot be above 100%"),
  "Enter a percentage between 0 and 100",
);

const defaultsSchema = z.object({
  zone1: money,
  zone2: money,
  zone3: money,
  zone4: money,
  remotePerKm: requiredNumberField(z.number().min(0, "Cannot be negative").max(100, "That rate looks too high"), "Enter a rate per kilometre, for example 1.20"),
  zone1MaxKm: km,
  zone2MaxKm: km,
  zone3MaxKm: km,
  zone4MaxKm: km,
  failedDeliveryPercent: percent,
});

/** Platform fallbacks, used by any pharmacy without its own override. */
export async function savePricingDefaults(input: unknown): Promise<PricingResult> {
  const parsed = defaultsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  const { zone1MaxKm, zone2MaxKm, zone3MaxKm, zone4MaxKm } = parsed.data;
  // Bands are read in order and the first match wins, so a band that does not
  // grow would make the zone after it unreachable.
  if (!(zone1MaxKm < zone2MaxKm && zone2MaxKm < zone3MaxKm && zone3MaxKm < zone4MaxKm)) {
    return { ok: false, error: "Each distance band must be larger than the one before it" };
  }
  try {
    const { db } = await requireAdmin();
    await updatePlatformSettings(db, {
      default_zone1_fee: parsed.data.zone1,
      default_zone2_fee: parsed.data.zone2,
      default_zone3_fee: parsed.data.zone3,
      default_zone4_fee: parsed.data.zone4,
      default_remote_per_km: parsed.data.remotePerKm,
      zone1_max_km: parsed.data.zone1MaxKm,
      zone2_max_km: parsed.data.zone2MaxKm,
      zone3_max_km: parsed.data.zone3MaxKm,
      zone4_max_km: parsed.data.zone4MaxKm,
      failed_delivery_fee_percent: parsed.data.failedDeliveryPercent,
    });
    revalidatePath("/pricing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save the default prices" };
  }
}

/** Blank means "use the platform default", so each field is optional. */
const optionalKm = optionalNumberField(z.number().min(0.1, "Must be above 0").max(2000, "That distance looks too high"), "Enter a distance in kilometres");
const configSchema = z.object({
  remotePerKm: optionalNumberField(z.number().min(0, "Cannot be negative").max(100, "That rate looks too high"), "Enter a rate per kilometre"),
  zone1MaxKm: optionalKm,
  zone2MaxKm: optionalKm,
  zone3MaxKm: optionalKm,
  zone4MaxKm: optionalKm,
});

// Blank clears the override so the pharmacy falls back to the default. It must
// stay null all the way to the database: a blank field that coerced to 0 used
// to overwrite the untouched delivery types with a $0.00 price.
const overrideValue = optionalNumberField(range, PRICE_HINT);
const overridesSchema = z.object({
  pharmacyId: z.string().uuid(),
  zone1: overrideValue,
  zone2: overrideValue,
  zone3: overrideValue,
  zone4: overrideValue,
  config: configSchema,
});

export async function savePharmacyPricingAction(input: unknown): Promise<PricingResult> {
  const parsed = overridesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  // Only the bands actually overridden are checked; the rest come from the
  // platform defaults, which are validated when those are saved.
  const set = [parsed.data.config.zone1MaxKm, parsed.data.config.zone2MaxKm, parsed.data.config.zone3MaxKm, parsed.data.config.zone4MaxKm];
  for (let i = 0; i < set.length - 1; i++) {
    const a = set[i];
    const b = set[i + 1];
    if (a != null && b != null && a >= b) {
      return { ok: false, error: "Each distance band must be larger than the one before it" };
    }
  }
  try {
    const { db } = await requireAdmin();
    const { pharmacyId, config, ...prices } = parsed.data;
    await savePharmacyPricing(db, pharmacyId, prices);
    await savePharmacyDeliveryConfig(db, pharmacyId, {
      remotePerKm: config.remotePerKm,
      zone1MaxKm: config.zone1MaxKm,
      zone2MaxKm: config.zone2MaxKm,
      zone3MaxKm: config.zone3MaxKm,
      zone4MaxKm: config.zone4MaxKm,
    });
    revalidatePath("/pricing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save this pharmacy's prices" };
  }
}


/**
 * Replaces a pharmacy's postal-area tags. The editor submits the whole set, so
 * this overwrites rather than merges — see saveZoneAreas.
 */
const assignmentsSchema = z.record(
  z.string().regex(/^[A-Z][0-9][A-Z]$/, "Postal areas must look like M5V"),
  z.enum(FIXED_ZONES as [FixedZone, ...FixedZone[]]).nullable(),
);

export async function saveZoneAreasAction(pharmacyId: string, assignments: unknown): Promise<PricingResult> {
  const id = z.string().uuid().safeParse(pharmacyId);
  if (!id.success) return { ok: false, error: "Unknown pharmacy" };
  const parsed = assignmentsSchema.safeParse(assignments);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the postal areas" };
  try {
    const { db } = await requireAdmin();
    await saveZoneAreas(db, id.data, parsed.data);
    revalidatePath("/pricing");
    revalidatePath(`/pharmacies/${id.data}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save the postal areas" };
  }
}
