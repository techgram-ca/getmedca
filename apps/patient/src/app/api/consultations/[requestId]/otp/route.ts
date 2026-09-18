import { z } from "zod";
import { createServiceClient } from "@getmed/db/service";
import { NotFoundError } from "@getmed/core/errors";
import { sendOtp } from "@getmed/core/otp";
import { clientIp, handler, json } from "@/lib/api";

const schema = z.object({ turnstileToken: z.string().nullable().optional() });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ requestId: string }> }) => {
  const { requestId } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const db = createServiceClient();
  const { data: r } = await db.from("consultation_requests").select("id, patient_phone, phone_verified_at").eq("id", requestId).maybeSingle();
  if (!r) throw new NotFoundError("Request not found");
  if (r.phone_verified_at) return json({ ok: true, alreadyVerified: true });
  await sendOtp(db, { phone: r.patient_phone, purpose: "consultation", targetId: r.id, turnstileToken: body.turnstileToken, ip: clientIp(req) });
  return json({ ok: true });
});
