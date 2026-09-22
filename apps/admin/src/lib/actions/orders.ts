"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { assignDriver, ensureOrderRoute, setDeliveryType, updateEscalation } from "@getmed/core/orders";
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

export type RouteResult =
  | { ok: true; distanceM: number | null; durationS: number | null; avoidsTolls: boolean | null }
  | { ok: false; error: string };

/**
 * Computes and stores this order's driving distance if it is missing.
 * Returns the stored value, so repeat calls cost nothing.
 */
export async function ensureOrderRouteAction(orderId: string, force = false): Promise<RouteResult> {
  try {
    const { db } = await requireAdmin();
    const route = await ensureOrderRoute(db, orderId, force);
    if (!route) {
      return { ok: false, error: "No driving route found. The delivery address may not have map coordinates." };
    }
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, distanceM: route.distanceM, durationS: route.durationS, avoidsTolls: route.avoidsTolls };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not work out the distance" };
  }
}

/** Fixes the order's delivery type and price. Must happen before a driver is assigned. */
export async function setDeliveryTypeAction(orderId: string, type: DeliveryType, customPrice?: number | null) {
  return wrap((admin) => setDeliveryType(orderId, { type, customPrice }, admin));
}

export async function escalationAction(orderId: string, status: "contacted" | "resolved", note: string) {
  return wrap((admin) => updateEscalation(orderId, status, note || null, admin));
}
