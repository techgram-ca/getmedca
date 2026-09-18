import { serve } from "inngest/next";
import { functions, inngest } from "@getmed/core/inngest";

/** Inngest serve endpoint — hosts the durable 30-minute SLA workflow. */
export const { GET, POST, PUT } = serve({ client: inngest, functions });
