"use server";

import { revalidatePath } from "next/cache";
import { requirePharmacy } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { acceptOrder, cancelOrder, markReady, rejectOrder } from "@getmed/core/orders";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: (pharmacyId: string) => Promise<unknown>): Promise<ActionResult> {
  try {
    const { pharmacy } = await requirePharmacy();
    await fn(pharmacy.id);
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Something went wrong" };
  }
}

export async function acceptOrderAction(orderId: string) {
  return run((pid) => acceptOrder(orderId, pid));
}
export async function rejectOrderAction(orderId: string, reason: string) {
  return run((pid) => rejectOrder(orderId, pid, reason));
}
export async function markReadyAction(orderId: string) {
  return run((pid) => markReady(orderId, pid));
}
export async function cancelOrderAction(orderId: string, reason: string) {
  return run((pid) => cancelOrder(orderId, pid, reason));
}
