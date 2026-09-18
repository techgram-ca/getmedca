"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@getmed/core/auth";
import { uploadPrivate } from "@getmed/core/storage";
import { phoneSchema } from "@getmed/core/validation";

export type DriverState = { error?: string; id?: string } | null;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.string().trim().email(),
  password: z.string().min(10, "Initial password must be at least 10 characters"),
  vehicleMake: z.string().trim().max(60).optional().or(z.literal("")),
  vehicleModel: z.string().trim().max(60).optional().or(z.literal("")),
  vehicleColor: z.string().trim().max(40).optional().or(z.literal("")),
  vehiclePlate: z.string().trim().max(20).optional().or(z.literal("")),
});

/** Admin creates the driver's auth user + driver row. */
export async function createDriver(_prev: DriverState, fd: FormData): Promise<DriverState> {
  const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  const { db } = await requireAdmin();

  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { role: "driver", full_name: d.name },
  });
  if (authErr || !created.user) return { error: authErr?.message ?? "Could not create login" };
  // The auth trigger creates the profile; force the role in case metadata is ignored.
  await db.from("profiles").upsert({ id: created.user.id, role: "driver", full_name: d.name });

  const driverId = crypto.randomUUID();
  const license = fd.get("licenseDoc");
  const insurance = fd.get("insuranceDoc");
  const [licensePath, insurancePath] = await Promise.all([
    license instanceof File && license.size > 0 ? uploadPrivate(db, "driver-docs", `${driverId}/license`, license) : null,
    insurance instanceof File && insurance.size > 0 ? uploadPrivate(db, "driver-docs", `${driverId}/insurance`, insurance) : null,
  ]);

  const { error } = await db.from("drivers").insert({
    id: driverId, user_id: created.user.id, name: d.name, phone: d.phone, email: d.email,
    vehicle_make: d.vehicleMake || null, vehicle_model: d.vehicleModel || null, vehicle_color: d.vehicleColor || null, vehicle_plate: d.vehiclePlate || null,
    license_doc_path: licensePath, insurance_doc_path: insurancePath,
  });
  if (error) {
    await db.auth.admin.deleteUser(created.user.id);
    return { error: error.message };
  }
  revalidatePath("/drivers");
  return { id: driverId };
}

export async function setDriverActive(driverId: string, active: boolean) {
  const { db } = await requireAdmin();
  await db.from("drivers").update({ active }).eq("id", driverId);
  revalidatePath("/drivers");
  revalidatePath(`/drivers/${driverId}`);
  return { ok: true as const };
}
