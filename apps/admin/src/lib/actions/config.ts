"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { slugify } from "@getmed/core/format";
import { TEMPLATE_DEFAULTS, validateTemplate, type NotificationEvent } from "@getmed/core/notifications";
import { updatePlatformSettings } from "@getmed/core/settings";
import type { NotificationChannel } from "@getmed/db/types";

type R = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid") : e instanceof Error ? e.message : "Failed" });

// ---- Issues (master consultation categories) ----
const issueSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(80), slug: z.string().trim().max(80).optional().or(z.literal("")), description: z.string().trim().max(300).optional().or(z.literal("")), active: z.boolean().default(true) });

export async function upsertIssue(input: unknown): Promise<R> {
  try {
    const d = issueSchema.parse(input);
    const { db } = await requireAdmin();
    const slug = slugify(d.slug || d.name);
    const row = { name: d.name, slug, description: d.description || null, active: d.active };
    const { error } = d.id ? await db.from("issues").update(row).eq("id", d.id) : await db.from("issues").insert(row);
    if (error) throw new Error(error.code === "23505" ? "That slug is already in use" : error.message);
    revalidatePath("/issues");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteIssue(id: string): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("issues").delete().eq("id", id);
  revalidatePath("/issues");
  return error ? { ok: false, error: "Could not delete — deactivate it instead if it's in use" } : { ok: true };
}

// ---- Form field required/optional toggles (fixed field set; no add/delete/reorder) ----
export async function setFieldRequired(fieldKey: string, appliesTo: "new_order" | "transfer" | "consultation", required: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("form_field_config").update({ required }).eq("field_key", fieldKey).eq("applies_to", appliesTo);
  revalidatePath("/forms");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---- Notification templates ----
const tplSchema = z.object({ event: z.string(), channel: z.enum(["sms", "email"]), subject: z.string().max(200).optional().nullable(), text: z.string().max(1600), enabled: z.boolean() });

export async function saveTemplate(input: unknown): Promise<R> {
  try {
    const d = tplSchema.parse(input);
    const { db } = await requireAdmin();
    const { data: existing } = await db.from("notification_templates").select("template_editable, template_text").eq("event_type", d.event).eq("channel", d.channel).maybeSingle();
    const editable = existing?.template_editable ?? d.event !== "otp";
    const textChanged = existing ? existing.template_text !== d.text : true;
    if (textChanged) {
      if (!editable) return { ok: false, error: "This template's text cannot be edited" };
      const v = validateTemplate(d.event, d.text);
      if (!v.ok) return { ok: false, error: v.error };
    }
    const { error } = await db.from("notification_templates").upsert(
      { event_type: d.event, channel: d.channel as NotificationChannel, subject: d.channel === "email" ? d.subject ?? null : null, template_text: editable ? d.text : (existing?.template_text ?? d.text), enabled: d.enabled, template_editable: editable, updated_at: new Date().toISOString() },
      { onConflict: "event_type,channel" },
    );
    if (error) throw error;
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resetTemplate(event: string, channel: "sms" | "email"): Promise<R> {
  const def = TEMPLATE_DEFAULTS[event as NotificationEvent]?.[channel];
  if (!def) return { ok: false, error: "No default for this template" };
  const { db } = await requireAdmin();
  const { error } = await db.from("notification_templates").upsert(
    { event_type: event, channel, subject: def.subject, template_text: def.text, enabled: def.enabled, template_editable: event !== "otp", updated_at: new Date().toISOString() },
    { onConflict: "event_type,channel" },
  );
  revalidatePath("/notifications");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---- Support inbox ----
export async function setSupportResolved(id: string, resolved: boolean): Promise<R> {
  const { db } = await requireAdmin();
  const { error } = await db.from("support_messages").update({ resolved }).eq("id", id);
  revalidatePath("/support");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---- Platform settings ----
const settingsSchema = z.object({ searchRadiusKm: z.coerce.number().min(1).max(200), flatDeliveryFee: z.coerce.number().min(0).max(1000), slaMinutes: z.coerce.number().int().min(5).max(240) });

export async function savePlatformSettings(input: unknown): Promise<R> {
  try {
    const d = settingsSchema.parse(input);
    const { db } = await requireAdmin();
    await updatePlatformSettings(db, { search_radius_km: d.searchRadiusKm, flat_delivery_fee: d.flatDeliveryFee, sla_minutes: d.slaMinutes });
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}
