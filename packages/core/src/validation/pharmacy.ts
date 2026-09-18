import { z } from "zod";
import { phoneSchema } from "./common";

export const hoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/), closed: z.boolean().optional() }),
);

export const signupStep1Schema = z.object({
  name: z.string().trim().min(2).max(120),
  addressLine: z.string().trim().min(5).max(200),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  phone: phoneSchema,
  email: z.string().trim().email(),
});

export const signupStep2Schema = z.object({
  licenseNumber: z.string().trim().min(2).max(60),
  licenseCollege: z.string().trim().min(2).max(120).default("Ontario College of Pharmacists"),
  picName: z.string().trim().min(2).max(120),
  picLicenseNumber: z.string().trim().min(2).max(60),
});

export const pharmacistSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  credentials: z.string().trim().max(200).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional().nullable(),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  languages: z.array(z.string().trim().max(40)).max(10).default([]),
  isMain: z.boolean().default(false),
  photoPath: z.string().max(300).optional().nullable(),
});

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(10000).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
});

export const signupStep5Schema = z.object({
  hours: hoursSchema,
  deliveryRadiusKm: z.coerce.number().min(0).max(200).optional().nullable(),
  estimatedDeliveryTime: z.string().trim().max(60).optional().or(z.literal("")),
  offersDelivery: z.boolean().default(true),
  offersTransfer: z.boolean().default(true),
  offersConsultation: z.boolean().default(true),
  acceptedInsurance: z.array(z.string().trim().max(60)).max(30).default([]),
  accessibilityNotes: z.string().trim().max(500).optional().or(z.literal("")),
  issueIds: z.array(z.string().uuid()).max(100).default([]),
});

export const signupStep6Schema = z.object({
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  logoPath: z.string().max(300).optional().nullable(),
  coverPath: z.string().max(300).optional().nullable(),
});
