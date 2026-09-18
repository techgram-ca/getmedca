import { z } from "zod";
import type { FormFieldConfigRow } from "@getmed/db/types";
import { addressSchema, phoneSchema, uuidSchema } from "./common";

export const orderTypeSchema = z.enum(["new", "transfer"]);

/** Fields shared by New + Transfer. Uploads arrive as multipart files and are validated separately. */
export const orderBaseSchema = z.object({
  pharmacyId: uuidSchema,
  orderType: orderTypeSchema,
  patientName: z.string().trim().min(2, "Enter the patient's full name").max(120),
  patientDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional().or(z.literal("")),
  patientPhone: phoneSchema,
  deliveryAddress: addressSchema,
  insuranceProvider: z.string().trim().max(120).optional().or(z.literal("")),
  insuranceMemberId: z.string().trim().max(60).optional().or(z.literal("")),
  insuranceGroupNumber: z.string().trim().max(60).optional().or(z.literal("")),
  healthCardNumber: z.string().trim().max(20).optional().or(z.literal("")),
  healthCardVersion: z.string().trim().max(4).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  transferFromPharmacyName: z.string().trim().max(150).optional().or(z.literal("")),
  transferFromPhone: z.string().trim().max(30).optional().or(z.literal("")),
  transferFromFax: z.string().trim().max(30).optional().or(z.literal("")),
  transferPrescriptionNumber: z.string().trim().max(60).optional().or(z.literal("")),
  consent: z.literal(true, { error: "You must consent to continue" }),
});
export type OrderFormInput = z.infer<typeof orderBaseSchema>;

export type Uploads = { prescription?: File | null; insurance?: File | null; healthCard?: File | null };

/**
 * Apply the admin-configured required/optional flags (spec §5). Returns a
 * map of field_key → error message for anything required but missing.
 */
export function applyFieldConfig(
  input: OrderFormInput,
  uploads: Uploads,
  config: FormFieldConfigRow[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const applies = input.orderType === "new" ? "new_order" : "transfer";
  for (const f of config) {
    if (f.applies_to !== applies || !f.required) continue;
    switch (f.field_key) {
      case "patient_dob":
        if (!input.patientDob) errors.patientDob = "Date of birth is required";
        break;
      case "prescription_file":
        if (input.orderType === "new" && !uploads.prescription) errors.prescription = "Upload your prescription";
        break;
      case "insurance":
        if (!uploads.insurance && !(input.insuranceProvider && input.insuranceMemberId))
          errors.insurance = "Provide insurance details or upload your card";
        break;
      case "health_card":
        if (!uploads.healthCard && !input.healthCardNumber) errors.healthCard = "Provide your health card number or upload it";
        break;
      case "notes":
        if (!input.notes && !input.allergies) errors.notes = "Please add notes or allergies";
        break;
      case "transfer_from_pharmacy":
        if (!input.transferFromPharmacyName) errors.transferFromPharmacyName = "Enter your current pharmacy";
        break;
      case "transfer_from_contact":
        if (!input.transferFromPhone && !input.transferFromFax) errors.transferFromPhone = "Enter a phone or fax number";
        break;
      case "transfer_prescription_number":
        if (!input.transferPrescriptionNumber) errors.transferPrescriptionNumber = "Enter the prescription number";
        break;
      default:
        break;
    }
  }
  return errors;
}
