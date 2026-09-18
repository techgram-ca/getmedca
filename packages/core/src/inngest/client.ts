import { Inngest, eventType } from "inngest";
import { z } from "zod";

/** Sent once the patient's phone is verified; starts the pharmacy SLA timer. */
export const orderCreated = eventType("order/created", {
  schema: z.object({ orderId: z.string(), slaMinutes: z.number() }),
});

/** Sent when the pharmacy accepts or rejects; stops the SLA timer. */
export const orderResponded = eventType("order/responded", {
  schema: z.object({ orderId: z.string() }),
});

/**
 * Durable workflow engine. Required for the 30-minute pharmacy SLA timer —
 * Vercel serverless functions cannot hold long-running timers.
 */
export const inngest = new Inngest({ id: "getmed" });
