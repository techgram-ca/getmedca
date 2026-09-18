"use server";

import { revalidatePath } from "next/cache";
import { requirePharmacy } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { acceptOrder, cancelOrder, createManualOrder, markReady, rejectOrder } from "@getmed/core/orders";
import { manualOrdersSchema } from "@getmed/core/validation";

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

export type ManualOrdersResult =
  | { ok: true; created: string[] }
  | { ok: false; error: string; rowErrors?: Record<number, Record<string, string>> };

/** Pharmacy adds one or more orders taken by phone / in store. Validates every row before creating any. */
export async function createManualOrdersAction(input: unknown): Promise<ManualOrdersResult> {
  const parsed = manualOrdersSchema.safeParse(input);
  if (!parsed.success) {
    const rowErrors: Record<number, Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const [root, idx, field] = issue.path;
      if (root === "orders" && typeof idx === "number") {
        (rowErrors[idx] ??= {})[String(field ?? "row")] = issue.message;
      }
    }
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the highlighted fields", rowErrors };
  }
  try {
    const { pharmacy, session } = await requirePharmacy();
    const created: string[] = [];
    for (const row of parsed.data.orders) {
      const o = await createManualOrder(pharmacy.id, session.userId, {
        orderType: row.orderType,
        patientName: row.patientName,
        patientPhone: row.patientPhone,
        patientDob: row.patientDob || null,
        deliveryAddress: row.deliveryAddress,
        deliveryNotes: row.deliveryNotes || null,
        allergies: row.allergies || null,
        transferFromPharmacyName: row.transferFromPharmacyName || null,
        transferFromPhone: row.transferFromPhone || null,
        transferPrescriptionNumber: row.transferPrescriptionNumber || null,
      });
      created.push(o.id);
    }
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    return { ok: true, created };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Something went wrong" };
  }
}
