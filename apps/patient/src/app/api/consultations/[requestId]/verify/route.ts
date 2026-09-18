import { z } from "zod";
import { createServiceClient } from "@getmed/db/service";
import { NotFoundError } from "@getmed/core/errors";
import { notify } from "@getmed/core/notifications";
import { verifyOtp } from "@getmed/core/otp";
import { clientIp, handler, json } from "@/lib/api";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

/** Verify OTP → mark verified → notify the pharmacy (pharmacist calls the patient directly). */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ requestId: string }> }) => {
  const { requestId } = await ctx.params;
  const { code } = schema.parse(await req.json());
  const db = createServiceClient();
  await verifyOtp(db, { targetId: requestId, purpose: "consultation", code, ip: clientIp(req) });

  const { data: r } = await db
    .from("consultation_requests")
    .update({ phone_verified_at: new Date().toISOString() })
    .eq("id", requestId)
    .is("phone_verified_at", null)
    .select("id, patient_name, pharmacy_id, issue_id, service_id")
    .maybeSingle();
  if (!r) {
    const { data: existing } = await db.from("consultation_requests").select("id").eq("id", requestId).maybeSingle();
    if (!existing) throw new NotFoundError("Request not found");
    return json({ ok: true, alreadyVerified: true });
  }

  const [{ data: pharmacy }, { data: issue }, { data: service }] = await Promise.all([
    db.from("pharmacies").select("name, phone, email, notify_sms, notify_email").eq("id", r.pharmacy_id).maybeSingle(),
    r.issue_id ? db.from("issues").select("name").eq("id", r.issue_id).maybeSingle() : Promise.resolve({ data: null }),
    r.service_id ? db.from("pharmacy_services").select("name").eq("id", r.service_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (pharmacy) {
    await notify(
      db,
      "consultation.new",
      { phone: pharmacy.notify_sms ? pharmacy.phone : null, email: pharmacy.notify_email ? pharmacy.email : null },
      { pharmacyName: pharmacy.name, patientName: r.patient_name, issue: issue?.name ?? service?.name ?? "a consultation" },
    );
  }
  return json({ ok: true });
});
