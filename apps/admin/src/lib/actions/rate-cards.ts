"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { slugify } from "@getmed/core/format";
import { parseRateList } from "@getmed/core/pricing";

type R = { ok: true; slug?: string } | { ok: false; error: string };

const cardSchema = z.object({
  id: z.string().uuid().optional(),
  city: z.string().trim().min(2, "Enter a city name").max(80),
  slug: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
  published: z.boolean(),
  /** The one-line rate list, exactly as it was typed. */
  rates: z.string().max(5000),
});

/**
 * Saves a rate card and the rows under it, in that order.
 *
 * The rows are replaced wholesale rather than merged. A rate card is read top
 * to bottom by someone deciding whether to sign up, so what matters is that
 * the page matches the text the admin just approved — not that an individual
 * row kept its id.
 */
export async function saveRateCard(input: unknown): Promise<R> {
  try {
    const d = cardSchema.parse(input);
    const { db } = await requireAdmin();

    const { rows, errors } = parseRateList(d.rates);
    // Anything the parser could not read is refused outright. A rate card is a
    // price list shown to pharmacies; publishing one with a line silently
    // dropped is worse than not saving.
    if (errors.length) return { ok: false, error: errors.join(" ") };
    if (!rows.length) return { ok: false, error: "Add at least one destination and rate." };

    const slug = slugify(d.slug || d.city).slice(0, 80);
    if (!slug) return { ok: false, error: "That city name has no usable URL in it — set a slug." };

    const { data: clash } = await db
      .from("delivery_rate_cards")
      .select("id")
      .eq("slug", slug)
      .neq("id", d.id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (clash) return { ok: false, error: `Another card already uses /delivery-rates/${slug}.` };

    const patch = { city: d.city, slug, note: d.note || null, published: d.published };
    const { data: card, error } = d.id
      ? await db.from("delivery_rate_cards").update(patch).eq("id", d.id).select("id").single()
      : await db.from("delivery_rate_cards").insert(patch).select("id").single();
    if (error) throw error;

    await db.from("delivery_rate_rows").delete().eq("card_id", card.id);
    const { error: rowError } = await db.from("delivery_rate_rows").insert(
      rows.map((r, i) => ({ card_id: card.id, destination: r.destination, price: r.price, sort_order: i })),
    );
    if (rowError) throw rowError;

    revalidatePath("/delivery-rates");
    return { ok: true, slug };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the details") : e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteRateCard(id: string): Promise<R> {
  const { db } = await requireAdmin();
  // The rows go with it, by the cascade on the foreign key.
  const { error } = await db.from("delivery_rate_cards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/delivery-rates");
  return { ok: true };
}

export async function setRateCardPublished(id: string, published: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("delivery_rate_cards").update({ published }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/delivery-rates");
  return { ok: true };
}
