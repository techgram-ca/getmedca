"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { savePharmacyPricing } from "@getmed/core/pricing";
import { updatePlatformSettings } from "@getmed/core/settings";

export type PricingResult = { ok: true } | { ok: false; error: string };

const money = z.coerce.number().min(0, "Price cannot be negative").max(1000, "That price looks too high");

const defaultsSchema = z.object({ local: money, gta: money, extended: money });

/** Platform fallbacks, used by any pharmacy without its own override. */
export async function savePricingDefaults(input: unknown): Promise<PricingResult> {
  const parsed = defaultsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  try {
    const { db } = await requireAdmin();
    await updatePlatformSettings(db, {
      default_local_fee: parsed.data.local,
      default_gta_fee: parsed.data.gta,
      default_extended_fee: parsed.data.extended,
    });
    revalidatePath("/pricing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save the default prices" };
  }
}

/** Blank clears the override so the pharmacy falls back to the default. */
const overrideValue = z.union([money, z.literal("").transform(() => null), z.null()]);
const overridesSchema = z.object({
  pharmacyId: z.string().uuid(),
  local: overrideValue,
  gta: overrideValue,
  extended: overrideValue,
});

export async function savePharmacyPricingAction(input: unknown): Promise<PricingResult> {
  const parsed = overridesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the prices" };
  try {
    const { db } = await requireAdmin();
    const { pharmacyId, ...prices } = parsed.data;
    await savePharmacyPricing(db, pharmacyId, prices);
    revalidatePath("/pricing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not save this pharmacy's prices" };
  }
}
