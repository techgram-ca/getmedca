import { z } from "zod";
import { createServiceClient } from "@getmed/db/service";
import { enforceRateLimit } from "@getmed/core/otp";
import { clientIp, handler, json } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  const db = createServiceClient();
  const ip = clientIp(req);
  if (ip) await enforceRateLimit(db, `contact:${ip}`, 5, 60 * 60);
  const { error } = await db.from("support_messages").insert({
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    message: body.message,
  });
  if (error) throw error;
  return json({ ok: true });
});
