import { z } from "zod";
import { normalizePhone } from "../format";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Canadian phone number" });
      return z.NEVER;
    }
    return n;
  });

export const postalCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, "Enter a valid postal code")
  .transform((v) => v.replace(/\s+/g, " "));

export const uuidSchema = z.string().uuid();

export const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter a street address").max(200),
  city: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(10).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});
export type AddressInput = z.infer<typeof addressSchema>;
