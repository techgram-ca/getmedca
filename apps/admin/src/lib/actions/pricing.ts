"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { FIXED_ZONES, savePharmacyDeliveryConfig, savePharmacyPricing, saveZoneAreas, validateZoneAreas, type FixedZone } from "@getmed/core/pricing";
import { optionalNumberField, requiredNumberField } from "@getmed/core/validation";
import { updatePlatformSettings } from "@getmed/core/settings";

export type PricingResult = { ok: true } | { ok: false; error: string };

const PRICE_HINT = "Enter a price, for example 7.50";
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
  failedDeliveryPercent: percent,
});

/** Platform fallbacks, used by any pharmacy without its own override. */
export async function savePricingDefaults(input: unknown): Promise<PricingResult> {
  const parsed = defaultsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  try {
    const { db } = await requireAdmin();
    await updatePlatformSettings(db, {
      default_zone1_fee: parsed.data.zone1,
      default_zone2_fee: parsed.data.zone2,
      default_zone3_fee: parsed.data.zone3,
      default_zone4_fee: parsed.data.zone4,
      default_remote_per_km: parsed.data.remotePerKm,
      failed_delivery_fee_percent: parsed.data.failedDeliveryPercent,
    });
    revalidatePath("/pricing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save the default prices" };
  }
}

/** Blank means "use the platform default". */
const configSchema = z.object({
  remotePerKm: optionalNumberField(z.number().min(0, "Cannot be negative").max(100, "That rate looks too high"), "Enter a rate per kilometre"),
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
  /** The four text boxes, validated server-side against the reference list. */
  areas: z.object({
    zone1: z.string().max(20000),
    zone2: z.string().max(20000),
    zone3: z.string().max(20000),
    zone4: z.string().max(20000),
  }),
});

export async function savePharmacyPricingAction(input: unknown): Promise<PricingResult> {
  const parsed = overridesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  try {
    const { db } = await requireAdmin();
    const { pharmacyId, config, areas, ...prices } = parsed.data;

    // Re-validated here rather than trusting the editor: the browser check is
    // for feedback, this is the one that decides what reaches the database.
    const { data: known } = await db.from("postal_areas").select("fsa");
    const check = validateZoneAreas(areas, new Set((known ?? []).map((r) => r.fsa)));
    if (check.duplicates.length) {
      const first = check.duplicates[0]!;
      return { ok: false, error: `${first.fsa} is in more than one zone. A postal code can only be in one.` };
    }
    if (check.unknown.length) return { ok: false, error: `Not on file: ${check.unknown.join(", ")}` };
    if (check.malformed.length) return { ok: false, error: `Not a postal area: ${check.malformed.join(", ")}` };

    await savePharmacyPricing(db, pharmacyId, prices);
    await saveZoneAreas(db, pharmacyId, check.assignments);
    await savePharmacyDeliveryConfig(db, pharmacyId, { remotePerKm: config.remotePerKm });
    revalidatePath("/pricing");
    revalidatePath(`/pricing/${pharmacyId}`);
    revalidatePath(`/pharmacies/${pharmacyId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save this pharmacy's prices" };
  }
}
