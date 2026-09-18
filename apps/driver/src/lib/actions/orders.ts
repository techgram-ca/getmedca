"use server";

import { revalidatePath } from "next/cache";
import { requireDriver } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { failDelivery, pickUpOrder, reassignDriver } from "@getmed/core/orders";

type R = { ok: true } | { ok: false; error: string };
const wrap = async (fn: (driverId: string) => Promise<unknown>): Promise<R> => {
  try {
    const { driver } = await requireDriver();
    await fn(driver.id);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Something went wrong" };
  }
};

export async function pickUpAction(orderId: string) {
  return wrap((d) => pickUpOrder(orderId, d));
}
export async function failAction(orderId: string, reason: string) {
  return wrap((d) => failDelivery(orderId, d, reason));
}
export async function reassignAction(orderId: string, toDriverId: string) {
  return wrap((d) => reassignDriver(orderId, d, toDriverId));
}

export async function savePushSubscription(subscription: unknown): Promise<R> {
  try {
    const { driver, db } = await requireDriver();
    await db.from("drivers").update({ push_subscription: subscription as never }).eq("id", driver.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save subscription" };
  }
}
