"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { deletePostalAreas, parseFsaText, renamePostalCity, upsertPostalAreas } from "@getmed/core/pricing";

export type PostalAreaResult = { ok: true; message: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/postal-areas");
  revalidatePath("/pricing");
}

const citySchema = z.object({
  city: z.string().trim().min(2, "Enter a city name").max(80),
  province: z.string().trim().length(2, "Province is a two-letter code").toUpperCase().default("ON"),
  fsas: z.string().max(20000),
});

/** Adds postal areas under a city, moving any that sit under another today. */
export async function savePostalAreasAction(input: unknown): Promise<PostalAreaResult> {
  const parsed = citySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  const { codes, malformed } = parseFsaText(parsed.data.fsas);
  if (malformed.length) return { ok: false, error: `Not a postal area: ${malformed.join(", ")}` };
  if (codes.length === 0) return { ok: false, error: "Enter at least one postal area, like M5V" };

  try {
    const { db } = await requireAdmin();
    const { added, moved } = await upsertPostalAreas(db, parsed.data.city, parsed.data.province, codes);
    refresh();
    return {
      ok: true,
      message:
        `${added} added to ${parsed.data.city}` +
        (moved.length ? ` · ${moved.length} moved from another city: ${moved.join(", ")}` : ""),
    };
  } catch (e) {
    return { ok: false, error: e instanceof AppError || e instanceof Error ? e.message : "Could not save the postal areas" };
  }
}

export async function renameCityAction(from: string, to: string): Promise<PostalAreaResult> {
  const parsed = z.object({ from: z.string().trim().min(1), to: z.string().trim().min(2).max(80) }).safeParse({ from, to });
  if (!parsed.success) return { ok: false, error: "Enter a city name" };
  try {
    const { db } = await requireAdmin();
    const count = await renamePostalCity(db, parsed.data.from, parsed.data.to);
    refresh();
    return { ok: true, message: `${count} postal ${count === 1 ? "area" : "areas"} moved to ${parsed.data.to}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not rename the city" };
  }
}

/**
 * Removes postal areas. Any pharmacy zone tag on them is removed by the
 * database alongside, which the editor warns about before calling this.
 */
export async function deletePostalAreasAction(fsas: string[]): Promise<PostalAreaResult> {
  const parsed = z.array(z.string().regex(/^[A-Z][0-9][A-Z]$/)).min(1).safeParse(fsas);
  if (!parsed.success) return { ok: false, error: "Nothing to remove" };
  try {
    const { db } = await requireAdmin();
    await deletePostalAreas(db, parsed.data);
    refresh();
    return { ok: true, message: `${parsed.data.length} postal ${parsed.data.length === 1 ? "area" : "areas"} removed` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove the postal areas" };
  }
}
