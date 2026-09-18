import { z } from "zod";
import type { FormFieldConfigRow } from "@getmed/db/types";
import { phoneSchema, uuidSchema } from "./common";

export const consultationSchema = z.object({
  pharmacyId: uuidSchema,
  issueSlug: z.string().trim().max(80).optional().or(z.literal("")),
  serviceId: uuidSchema.optional().or(z.literal("")),
  patientName: z.string().trim().min(2).max(120),
  patientPhone: phoneSchema,
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  callbackWindow: z.enum(["morning", "afternoon", "evening"]).optional().or(z.literal("")),
  consent: z.literal(true, { error: "You must consent to continue" }),
});
export type ConsultationInput = z.infer<typeof consultationSchema>;

export function applyConsultationFieldConfig(input: ConsultationInput, config: FormFieldConfigRow[]) {
  const errors: Record<string, string> = {};
  for (const f of config) {
    if (f.applies_to !== "consultation" || !f.required) continue;
    if (f.field_key === "description" && !input.description) errors.description = "Please describe your concern";
    if (f.field_key === "callback_window" && !input.callbackWindow) errors.callbackWindow = "Choose a callback window";
  }
  return errors;
}
