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
 *
 * One contact per address. Adding a pharmacy twice splits its history across
 * two tokens, so the visits land on one row while the follow-up goes out
 * quoting the other, and there is no way to tell afterwards which link they
 * actually clicked. The database enforces this too; the check here exists to
 * name the row already holding the address, which a constraint violation
 * cannot.
 */
export async function saveContact(input: unknown): Promise<R> {
  try {
    const d = contactSchema.parse(input);
    const { db } = await requireAdmin();

    const email = (d.contactEmail ?? "").trim();
    if (email) {
      // Case-insensitively, the way the index matches: the same address gets
      // typed two ways and they are still the same pharmacy. `_` and `%` are
      // legal in an address and are wildcards to ILIKE, so they are escaped
      // and the match is confirmed in full afterwards — otherwise
      // `a_b@rx.ca` would collide with `axb@rx.ca`.
      const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
      let q = db.from("outreach_contacts").select("id, pharmacy_name, contact_email").ilike("contact_email", pattern);
      if (d.id) q = q.neq("id", d.id);
      const { data: found } = await q.limit(5);
      const clash = (found ?? []).find((c) => (c.contact_email ?? "").trim().toLowerCase() === email.toLowerCase());
      if (clash) {
        return {
          ok: false,
          error: `${email} is already on the list, under "${clash.pharmacy_name}". Open that contact instead — a second row would split their history across two tokens.`,
        };
      }
    }

    const patch = {
      pharmacy_name: d.pharmacyName,
      contact_email: email || null,
      city: d.city || null,
      outcome: d.outcome,
      notes: d.notes || null,
    };
    const { error } = d.id
      ? await db.from("outreach_contacts").update(patch).eq("id", d.id)
      : await db.from("outreach_contacts").insert({ ...patch, token: generateOutreachToken() });
    // The index is the one that cannot be raced past. Its message names a
    // constraint, so it gets translated back into something readable.
    if (error) {
      if (error.code === "23505" && error.message.includes("outreach_contacts_email_unique")) {
        return { ok: false, error: `${email} is already on the list. Open that contact instead.` };
      }
      throw error;
    }
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


// ---------------- Email templates ----------------

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Give the template a name").max(80),
  subject: z.string().trim().max(200),
  body: z.string().max(60_000),
  isDefault: z.boolean().optional(),
});

/**
 * Saves an email template.
 *
 * Promoting one to default demotes the rest first, because the partial unique
 * index allows exactly one and would otherwise reject the save. Done in this
 * order rather than relying on the index to sort it out: a half-applied swap
 * would leave the list with no default at all.
 */
export async function saveEmailTemplate(input: unknown): Promise<R> {
  try {
    const d = templateSchema.parse(input);
    const { db } = await requireAdmin();
    if (d.isDefault) {
      let clear = db.from("outreach_email_templates").update({ is_default: false }).eq("is_default", true);
      if (d.id) clear = clear.neq("id", d.id);
      const { error } = await clear;
      if (error) throw error;
    }
    const patch = { name: d.name, subject: d.subject, body: d.body, is_default: d.isDefault ?? false };
    const { error } = d.id
      ? await db.from("outreach_email_templates").update(patch).eq("id", d.id)
      : await db.from("outreach_email_templates").insert(patch);
    if (error) throw error;
    revalidatePath("/tracking");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteEmailTemplate(id: string): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("outreach_email_templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tracking");
  return { ok: true };
}
