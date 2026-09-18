import { z } from "zod";
import { addressSchema, phoneSchema } from "./common";

/** One row of the pharmacy's "Add order" form. Several rows may be submitted at once. */
export const manualOrderRowSchema = z.object({
  orderType: z.enum(["new", "transfer"]),
  patientName: z.string().trim().min(2, "Enter the patient's name").max(120),
  patientPhone: phoneSchema,
  patientDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional().or(z.literal("")),
  deliveryAddress: addressSchema,
  deliveryNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  transferFromPharmacyName: z.string().trim().max(150).optional().or(z.literal("")),
  transferFromPhone: z.string().trim().max(30).optional().or(z.literal("")),
  transferPrescriptionNumber: z.string().trim().max(60).optional().or(z.literal("")),
  /** Pharmacy attests the patient consented (by phone / in person) to delivery via GetMed. */
  consentConfirmed: z.literal(true, { error: "Confirm the patient consented" }),
});
export type ManualOrderRow = z.infer<typeof manualOrderRowSchema>;

export const manualOrdersSchema = z.object({ orders: z.array(manualOrderRowSchema).min(1, "Add at least one order").max(20, "Up to 20 orders at a time") });
