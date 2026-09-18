"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";

export async function resolveConsultation(id: string, note: string) {
  const { db } = await requireAdmin();
  const { error } = await db.from("consultation_requests").update({ status: "resolved", resolved_at: new Date().toISOString(), admin_note: note || null }).eq("id", id);
  revalidatePath("/consultations");
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
