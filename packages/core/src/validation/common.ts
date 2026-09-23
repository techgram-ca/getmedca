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

/**
 * A delivery address must come from the address picker, not be typed freehand.
 * Pricing needs the postal code (to match a tagged zone) and the coordinates
 * (to measure the driving distance); without both, an order cannot be priced
 * automatically and lands on an admin's desk. The picker supplies all four, so
 * requiring them here is what keeps pricing automatic.
 */
export const addressSchema = z.object({
  line: z.string().trim().min(5, "Enter a street address").max(200),
  city: z.string().trim().max(100).optional().nullable(),
  postalCode: postalCodeSchema,
  lat: z.number({ error: "Choose your address from the list of suggestions" }),
  lng: z.number({ error: "Choose your address from the list of suggestions" }),
});
export type AddressInput = z.infer<typeof addressSchema>;

/**
 * Numbers typed into a form arrive as strings, and a blank field arrives as "".
 * `z.coerce.number()` turns "" (and null) into 0, so a field the user left
 * alone silently saved a real zero — a blank delivery price became $0.00.
 * These helpers decide "blank" first, so blank never reaches the coercion.
 */
const isBlank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");

function readNumber(message: string, blankIsNull: boolean) {
  return z.unknown().transform((v, ctx) => {
    if (isBlank(v)) {
      if (blankIsNull) return null;
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    const n = typeof v === "string" ? Number(v.trim()) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });
}

/** Optional number field: blank (or null/undefined) means "not set", never 0. */
export function optionalNumberField(range: z.ZodNumber, message = "Enter a number") {
  return readNumber(message, true).pipe(range.nullable());
}

/** Required number field: blank fails with `message` instead of becoming 0. */
export function requiredNumberField(range: z.ZodNumber, message = "Enter a number") {
  return readNumber(message, false).pipe(range);
}
