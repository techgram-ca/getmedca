"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { assignDriver, setDeliveryType, updateEscalation } from "@getmed/core/orders";
import type { DeliveryType } from "@getmed/db/types";

type R = { ok: true } | { ok: false; error: string };
const wrap = async (fn: (adminId: string) => Promise<unknown>): Promise<R> => {
  try {
    const { session } = await requireAdmin();
    await fn(session.userId);
    revalidatePath("/orders");
    revalidatePath("/escalations");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Something went wrong" };
  }
};

export async function assignDriverAction(orderId: string, driverId: string) {
  return wrap((admin) => assignDriver(orderId, driverId, admin));
}

/** Fixes the order's delivery type and price. Must happen before a driver is assigned. */
export async function setDeliveryTypeAction(orderId: string, type: DeliveryType, customPrice?: number | null) {
  return wrap((admin) => setDeliveryType(orderId, { type, customPrice }, admin));
}

export async function escalationAction(orderId: string, status: "contacted" | "resolved", note: string) {
  return wrap((admin) => updateEscalation(orderId, status, note || null, admin));
}
