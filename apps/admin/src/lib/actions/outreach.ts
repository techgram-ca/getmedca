"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { generateOutreachToken, isSafeRulePath, OUTCOMES } from "@getmed/core/outreach";

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

// ---------------- Link destinations ----------------

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  // Empty is the bare /i/<token>. Otherwise one path-safe word.
  slug: z.string().trim().max(40).regex(/^[a-z0-9-]*$/, "Letters, numbers and hyphens only"),
  site: z.enum(["pharmacy", "patient"]),
  path: z.string().trim().min(1).max(200).refine(isSafeRulePath, "Must start with / and name no host"),
  appendsRest: z.boolean(),
  label: z.string().trim().min(2, "Give it a name").max(80),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

/**
 * Saves a destination rule.
 *
 * The path is checked here as well as by the column and again immediately
 * before a redirect. It decides where a link on our own domain sends people,
 * so one check is not enough places for it.
 */
export async function saveLinkRule(input: unknown): Promise<R> {
  try {
    const d = ruleSchema.parse(input);
    const { db } = await requireAdmin();
    const patch = {
      slug: d.slug,
      site: d.site,
      path: d.path,
      appends_rest: d.appendsRest,
      label: d.label,
      sort_order: d.sortOrder ?? 100,
    };
    const { error } = d.id
      ? await db.from("outreach_link_rules").update(patch).eq("id", d.id)
      : await db.from("outreach_link_rules").insert(patch);
    if (error) throw error;
    revalidatePath("/tracking");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLinkRule(id: string): Promise<R> {
  const { db } = await requireAdmin();
  const { data: rule } = await db.from("outreach_link_rules").select("slug").eq("id", id).maybeSingle();
  // The bare /i/<token> is in every email already sent. Without its rule
  // those links still work, but only by falling through to the pitch — which
  // is where it points anyway, so losing it quietly is worse than refusing.
  if (rule?.slug === "") return { ok: false, error: "The bare link rule cannot be removed — every invite uses it." };
  const { error } = await db.from("outreach_link_rules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}
