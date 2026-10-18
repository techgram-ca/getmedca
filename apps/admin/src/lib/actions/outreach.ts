"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { generateOutreachToken, OUTCOMES } from "@getmed/core/outreach";

type R = { ok: true } | { ok: false; error: string };

const fail = (e: unknown): R => ({
  ok: false,
  error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the details") : e instanceof Error ? e.message : "Failed",
});

const contactSchema = z.object({
  id: z.string().uuid().optional(),
  pharmacyName: z.string().trim().min(2, "Enter the pharmacy name").max(120),
  contactEmail: z.string().trim().email("That is not an email address").or(z.literal("")).optional(),
  city: z.string().trim().max(80).optional(),
  destinationPath: z.string().trim().min(1).max(200),
  outcome: z.enum(OUTCOMES),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Creates or edits a contact. The token is minted once, on creation, and never
 * changes — it is in an email somebody already has, and a rotated token would
 * turn their link into a dead one.
 */
export async function saveContact(input: unknown): Promise<R> {
  try {
    const d = contactSchema.parse(input);
    const { db } = await requireAdmin();
    const patch = {
      pharmacy_name: d.pharmacyName,
      contact_email: d.contactEmail || null,
      city: d.city || null,
      destination_path: d.destinationPath,
      outcome: d.outcome,
      notes: d.notes || null,
    };
    const { error } = d.id
      ? await db.from("outreach_contacts").update(patch).eq("id", d.id)
      : await db.from("outreach_contacts").insert({ ...patch, token: generateOutreachToken() });
    if (error) throw error;
    revalidatePath("/tracking");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marks the moment the email actually went out, which only a human knows. */
export async function markSent(id: string, sent: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("outreach_contacts")
    .update({ sent_at: sent ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}

/**
 * Attaches a contact to the pharmacy account it produced.
 *
 * The strong form of "they signed up": once linked, every stage after it reads
 * itself off the pharmacy row and keeps up without anyone maintaining it.
 */
export async function linkPharmacy(id: string, pharmacyId: string | null): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("outreach_contacts").update({ pharmacy_id: pharmacyId }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}

/**
 * The weak form: "I know they signed up, I cannot point at which row."
 *
 * Kept separate from the link rather than collapsed into one field, so the
 * table can show which claim it is resting on.
 */
export async function markSignedUp(id: string, signedUp: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("outreach_contacts")
    .update({ manual_signed_up_at: signedUp ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}

/** Undoes an unsubscribe, for the one that was a scanner after all. */
export async function setUnsubscribed(id: string, unsubscribed: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("outreach_contacts")
    .update({ unsubscribed_at: unsubscribed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}

export async function deleteContact(id: string): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("outreach_contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}
