"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { assignDriver, updateEscalation } from "@getmed/core/orders";

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

export async function escalationAction(orderId: string, status: "contacted" | "resolved", note: string) {
  return wrap((admin) => updateEscalation(orderId, status, note || null, admin));
}
