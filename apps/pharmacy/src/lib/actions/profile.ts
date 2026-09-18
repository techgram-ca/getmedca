"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePharmacy } from "@getmed/core/auth";
import { slugify } from "@getmed/core/format";
import type { TablesUpdate } from "@getmed/db/types";
import { pharmacistSchema, phoneSchema, serviceSchema, signupStep1Schema, signupStep2Schema, signupStep5Schema, signupStep6Schema } from "@getmed/core/validation";

type R = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid input") : e instanceof Error ? e.message : "Failed" });

function point(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null ? `SRID=4326;POINT(${lng} ${lat})` : undefined;
}

// ---------------- Signup wizard autosave ----------------
export async function saveStep1(input: unknown): Promise<R> {
  try {
    const d = signupStep1Schema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const { error } = await db.from("pharmacies").update({
      name: d.name, address_line: d.addressLine, city: d.city || null, postal_code: d.postalCode || null,
      phone: d.phone, email: d.email, location: point(d.lat, d.lng) ?? null, signup_step: Math.max(2, pharmacy.signup_step),
    }).eq("id", pharmacy.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveStep2(input: unknown, licenseDocPath: string | null): Promise<R> {
  try {
    const d = signupStep2Schema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const patch: TablesUpdate<"pharmacies"> = {
      license_number: d.licenseNumber, license_college: d.licenseCollege, pic_name: d.picName, pic_license_number: d.picLicenseNumber,
      signup_step: Math.max(3, pharmacy.signup_step),
    };
    if (licenseDocPath) patch.license_doc_path = licenseDocPath;
    const { error } = await db.from("pharmacies").update(patch).eq("id", pharmacy.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveStep5(input: unknown): Promise<R> {
  try {
    const d = signupStep5Schema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const { error } = await db.from("pharmacies").update({
      hours: d.hours, delivery_radius_km: d.deliveryRadiusKm ?? null, estimated_delivery_time: d.estimatedDeliveryTime || null,
      offers_delivery: d.offersDelivery, offers_transfer: d.offersTransfer, offers_consultation: d.offersConsultation,
      accepted_insurance: d.acceptedInsurance, accessibility_notes: d.accessibilityNotes || null, signup_step: Math.max(6, pharmacy.signup_step),
    }).eq("id", pharmacy.id);
    if (error) throw error;
    await db.from("pharmacy_issues").delete().eq("pharmacy_id", pharmacy.id);
    if (d.issueIds.length) await db.from("pharmacy_issues").insert(d.issueIds.map((issue_id) => ({ pharmacy_id: pharmacy.id, issue_id })));
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveStep6(input: unknown): Promise<R> {
  try {
    const d = signupStep6Schema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const patch: TablesUpdate<"pharmacies"> = { tagline: d.tagline || null, bio: d.bio || null, signup_step: Math.max(7, pharmacy.signup_step) };
    if (d.logoPath !== undefined) patch.logo_path = d.logoPath;
    if (d.coverPath !== undefined) patch.cover_path = d.coverPath;
    const { error } = await db.from("pharmacies").update(patch).eq("id", pharmacy.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function advanceStep(step: number): Promise<R> {
  const { pharmacy, db } = await requirePharmacy();
  await db.from("pharmacies").update({ signup_step: Math.max(step, pharmacy.signup_step) }).eq("id", pharmacy.id);
  return { ok: true };
}

export async function submitSignup(): Promise<R> {
  try {
    const { pharmacy, db } = await requirePharmacy();
    const { data: p } = await db.from("pharmacies").select("name, address_line, phone, license_number, license_doc_path, pic_name, slug").eq("id", pharmacy.id).single();
    if (!p?.name || !p.address_line || !p.phone) return { ok: false, error: "Complete your business basics first" };
    if (!p.license_number || !p.pic_name) return { ok: false, error: "Complete your licensing details first" };
    if (!p.license_doc_path) return { ok: false, error: "Upload your licence document" };
    let slug = p.slug ?? slugify(p.name);
    if (!p.slug) {
      const { data: clash } = await db.from("pharmacies").select("id").eq("slug", slug).neq("id", pharmacy.id).maybeSingle();
      if (clash) slug = `${slug}-${pharmacy.id.slice(0, 4)}`;
    }
    const { error } = await db.from("pharmacies").update({ slug, submitted_at: new Date().toISOString(), status: "pending", signup_step: 7 }).eq("id", pharmacy.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------------- Profile editing (post-signup) ----------------
const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.string().trim().email(),
  addressLine: z.string().trim().min(5).max(200),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  logoPath: z.string().max(300).nullable().optional(),
  coverPath: z.string().max(300).nullable().optional(),
  deliveryRadiusKm: z.coerce.number().min(0).max(200).nullable().optional(),
  estimatedDeliveryTime: z.string().trim().max(60).optional().or(z.literal("")),
  offersDelivery: z.boolean(),
  offersTransfer: z.boolean(),
  offersConsultation: z.boolean(),
  acceptedInsurance: z.array(z.string().trim().max(60)).max(30),
  accessibilityNotes: z.string().trim().max(500).optional().or(z.literal("")),
  issueIds: z.array(z.string().uuid()).max(100),
});

export async function saveProfile(input: unknown): Promise<R> {
  try {
    const d = profileSchema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const patch: TablesUpdate<"pharmacies"> = {
      name: d.name, phone: d.phone, email: d.email, address_line: d.addressLine, city: d.city || null, postal_code: d.postalCode || null,
      tagline: d.tagline || null, bio: d.bio || null, delivery_radius_km: d.deliveryRadiusKm ?? null, estimated_delivery_time: d.estimatedDeliveryTime || null,
      offers_delivery: d.offersDelivery, offers_transfer: d.offersTransfer, offers_consultation: d.offersConsultation,
      accepted_insurance: d.acceptedInsurance, accessibility_notes: d.accessibilityNotes || null,
    };
    const loc = point(d.lat, d.lng);
    if (loc) patch.location = loc;
    if (d.logoPath !== undefined) patch.logo_path = d.logoPath;
    if (d.coverPath !== undefined) patch.cover_path = d.coverPath;
    const { error } = await db.from("pharmacies").update(patch).eq("id", pharmacy.id);
    if (error) throw error;
    await db.from("pharmacy_issues").delete().eq("pharmacy_id", pharmacy.id);
    if (d.issueIds.length) await db.from("pharmacy_issues").insert(d.issueIds.map((issue_id) => ({ pharmacy_id: pharmacy.id, issue_id })));
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveHours(hours: unknown): Promise<R> {
  try {
    const d = signupStep5Schema.shape.hours.parse(hours);
    const { pharmacy, db } = await requirePharmacy();
    const { error } = await db.from("pharmacies").update({ hours: d }).eq("id", pharmacy.id);
    if (error) throw error;
    revalidatePath("/profile/hours");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function upsertService(input: unknown): Promise<R> {
  try {
    const d = serviceSchema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const row = { pharmacy_id: pharmacy.id, name: d.name, description: d.description || null, price: d.price ?? null, duration_minutes: d.durationMinutes ?? null };
    const { error } = d.id
      ? await db.from("pharmacy_services").update(row).eq("id", d.id).eq("pharmacy_id", pharmacy.id)
      : await db.from("pharmacy_services").insert(row);
    if (error) throw error;
    revalidatePath("/profile/services");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteService(id: string): Promise<R> {
  const { pharmacy, db } = await requirePharmacy();
  await db.from("pharmacy_services").delete().eq("id", id).eq("pharmacy_id", pharmacy.id);
  revalidatePath("/profile/services");
  return { ok: true };
}

export async function upsertPharmacist(input: unknown): Promise<R> {
  try {
    const d = pharmacistSchema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    if (d.isMain) await db.from("pharmacists").update({ is_main: false }).eq("pharmacy_id", pharmacy.id);
    const row: TablesUpdate<"pharmacists"> & { pharmacy_id: string; name: string } = {
      pharmacy_id: pharmacy.id, name: d.name, credentials: d.credentials || null, years_experience: d.yearsExperience ?? null,
      bio: d.bio || null, languages: d.languages, is_main: d.isMain,
    };
    if (d.photoPath !== undefined) row.photo_path = d.photoPath;
    const { error } = d.id
      ? await db.from("pharmacists").update(row).eq("id", d.id).eq("pharmacy_id", pharmacy.id)
      : await db.from("pharmacists").insert(row);
    if (error) throw error;
    revalidatePath("/profile/pharmacists");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deletePharmacist(id: string): Promise<R> {
  const { pharmacy, db } = await requirePharmacy();
  await db.from("pharmacists").delete().eq("id", id).eq("pharmacy_id", pharmacy.id);
  revalidatePath("/profile/pharmacists");
  return { ok: true };
}

const notifySchema = z.object({ notifySms: z.boolean(), notifyEmail: z.boolean(), notifySound: z.boolean() });
export async function saveNotificationPrefs(input: unknown): Promise<R> {
  try {
    const d = notifySchema.parse(input);
    const { pharmacy, db } = await requirePharmacy();
    const { error } = await db.from("pharmacies").update({ notify_sms: d.notifySms, notify_email: d.notifyEmail, notify_sound: d.notifySound }).eq("id", pharmacy.id);
    if (error) throw error;
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setSelfPaused(paused: boolean): Promise<R> {
  const { pharmacy, db } = await requirePharmacy();
  if (paused) {
    await db.from("pharmacies").update({ status: "inactive", inactive_reason: "Paused by pharmacy" }).eq("id", pharmacy.id).eq("status", "approved");
  } else {
    await db.from("pharmacies").update({ status: "approved", inactive_reason: null }).eq("id", pharmacy.id).eq("status", "inactive").eq("inactive_reason", "Paused by pharmacy");
  }
  revalidatePath("/settings");
  return { ok: true };
}
