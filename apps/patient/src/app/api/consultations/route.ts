import { createServiceClient } from "@getmed/db/service";
import { AppError } from "@getmed/core/errors";
import { sendOtp } from "@getmed/core/otp";
import { applyConsultationFieldConfig, consultationSchema } from "@getmed/core/validation";
import { z } from "zod";
import { clientIp, handler, json } from "@/lib/api";

const bodySchema = consultationSchema.extend({ turnstileToken: z.string().nullable().optional() });

/** POST /api/consultations — create an unverified request and send the OTP. */
export const POST = handler(async (req: Request) => {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    return json({ error: "Please check the highlighted fields", fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  const db = createServiceClient();

  const { data: pharmacy } = await db.from("pharmacies").select("id, status, offers_consultation").eq("id", input.pharmacyId).maybeSingle();
  if (!pharmacy || pharmacy.status !== "approved") throw new AppError("This pharmacy is not accepting requests", 400);

  const { data: config } = await db.from("form_field_config").select("*").eq("applies_to", "consultation");
  const fieldErrors = applyConsultationFieldConfig(input, config ?? []);
  if (Object.keys(fieldErrors).length) return json({ error: "Please check the highlighted fields", fieldErrors }, { status: 400 });

  let issueId: string | null = null;
  if (input.issueSlug) {
    const { data: issue } = await db.from("issues").select("id").eq("slug", input.issueSlug).eq("active", true).maybeSingle();
    issueId = issue?.id ?? null;
  }
  if (!issueId && !input.serviceId) return json({ error: "Please choose a topic", fieldErrors: { issueSlug: "Choose a topic" } }, { status: 400 });

  const { data: request, error } = await db
    .from("consultation_requests")
    .insert({
      pharmacy_id: input.pharmacyId,
      issue_id: issueId,
      service_id: input.serviceId || null,
      patient_name: input.patientName,
      patient_phone: input.patientPhone,
      description: input.description || null,
      callback_window: input.callbackWindow || null,
      consent_given_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  await sendOtp(db, { phone: input.patientPhone, purpose: "consultation", targetId: request.id, turnstileToken: input.turnstileToken, ip: clientIp(req) });
  return json({ requestId: request.id });
});
