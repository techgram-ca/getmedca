import { z } from "zod";
import { createServiceClient } from "@getmed/db/service";
import { NotFoundError } from "@getmed/core/errors";
import { sendOtp } from "@getmed/core/otp";
import { clientIp, handler, json } from "@/lib/api";

const schema = z.object({ turnstileToken: z.string().nullable().optional() });

/** Resend the OTP for an unverified order. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const db = createServiceClient();
  const { data: order } = await db.from("orders").select("id, patient_phone, phone_verified_at").eq("id", orderId).maybeSingle();
  if (!order) throw new NotFoundError("Order not found");
  if (order.phone_verified_at) return json({ ok: true, alreadyVerified: true });
  const r = await sendOtp(db, { phone: order.patient_phone, purpose: "order", targetId: order.id, turnstileToken: body.turnstileToken, ip: clientIp(req) });
  return json({ ok: true, expiresAt: r.expiresAt });
});
