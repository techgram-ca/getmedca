"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { countZoneAreas } from "@getmed/core/pricing";
import { sendEmail } from "@getmed/core/notifications";

type R = { ok: true } | { ok: false; error: string };

export async function setPharmacyStatus(pharmacyId: string, status: "approved" | "inactive" | "rejected", reason?: string): Promise<R> {
  const { db } = await requireAdmin();
  const { data: p } = await db.from("pharmacies").select("email, name").eq("id", pharmacyId).maybeSingle();
  if (!p) return { ok: false, error: "Pharmacy not found" };
  // An approved pharmacy takes live orders, and an untagged one would have
  // every delivery priced by distance instead of by the cities it was sold.
  if (status === "approved" && (await countZoneAreas(db, pharmacyId)) === 0) {
    return { ok: false, error: "Tag this pharmacy's delivery cities before approving it — without them every order is priced by distance." };
  }
  const patch =
    status === "approved"
      ? { status: "approved" as const, approved_at: new Date().toISOString(), inactive_reason: null, rejected_reason: null }
      : status === "inactive"
        ? { status: "inactive" as const, inactive_reason: reason ?? "Set inactive by GetMed" }
        : { status: "pending" as const, submitted_at: null, rejected_reason: reason ?? "Application not approved" };
  const { error } = await db.from("pharmacies").update(patch).eq("id", pharmacyId);
  if (error) return { ok: false, error: error.message };
  if (p.email) {
    const subject = status === "approved" ? "Your GetMed pharmacy listing is live" : status === "inactive" ? "Your GetMed listing has been set inactive" : "Your GetMed application needs attention";
    const body = status === "approved"
      ? `Hi ${p.name},\n\nYour pharmacy has been approved and is now visible to patients on GetMed.`
      : `Hi ${p.name},\n\n${status === "inactive" ? "Your listing has been set inactive" : "We could not approve your application"}: ${reason ?? ""}\n\nPlease contact GetMed support if you have questions.`;
    await sendEmail(p.email, subject, body).catch(() => undefined);
  }
  revalidatePath("/pharmacies");
  revalidatePath(`/pharmacies/${pharmacyId}`);
  return { ok: true };
}
