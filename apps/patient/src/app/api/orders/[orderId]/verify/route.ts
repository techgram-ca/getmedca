import { z } from "zod";
import { createServiceClient } from "@getmed/db/service";
import { activateOrder } from "@getmed/core/orders";
import { verifyOtp } from "@getmed/core/otp";
import { clientIp, handler, json } from "@/lib/api";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

/** Verify the OTP → mark phone verified → notify pharmacy + start SLA timer. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const { code } = schema.parse(await req.json());
  const db = createServiceClient();
  await verifyOtp(db, { targetId: orderId, purpose: "order", code, ip: clientIp(req) });
  await activateOrder(orderId, { db });
  return json({ ok: true });
});
