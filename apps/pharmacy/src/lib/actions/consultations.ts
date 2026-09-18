"use server";

import { revalidatePath } from "next/cache";
import { requirePharmacy } from "@getmed/core/auth";
import type { ConsultationStatus, TablesUpdate } from "@getmed/db/types";

export async function updateConsultationAction(id: string, status: ConsultationStatus, note: string | null) {
  const { pharmacy, db } = await requirePharmacy();
  const patch: TablesUpdate<"consultation_requests"> = { status, pharmacy_note: note };
  if (status === "contacted") patch.contacted_at = new Date().toISOString();
  if (status === "resolved") patch.resolved_at = new Date().toISOString();
  const { error } = await db.from("consultation_requests").update(patch).eq("id", id).eq("pharmacy_id", pharmacy.id);
  revalidatePath("/consultations");
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
