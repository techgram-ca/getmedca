"use server";

import { revalidatePath } from "next/cache";
import { requirePharmacy } from "@getmed/core/auth";
import { AppError } from "@getmed/core/errors";
import { acceptOrder, cancelOrder, createManualOrder, markReady, rejectOrder, returnToDelivery } from "@getmed/core/orders";
import { quoteAddress, type AddressQuote } from "@getmed/core/pricing";
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

/** Sends a failed delivery back out. The failed attempt stays billed. */
export async function returnToDeliveryAction(orderId: string, note: string) {
  return run((pid) => returnToDelivery(orderId, "pharmacy", pid, note || null));
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


export type QuoteResult = { ok: true; quote: AddressQuote } | { ok: false; error: string };

/**
 * What a delivery to this address will cost, for the manual order form. Uses
 * the same rules the order itself will be priced by, so the figure shown is the
 * figure charged — a tagged postal code answers from the pharmacy's zones, and
 * only an untagged one needs a route looked up.
 */
export async function quoteAddressAction(address: {
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<QuoteResult> {
  try {
    const { pharmacy, db } = await requirePharmacy();
    return { ok: true, quote: await quoteAddress(db, pharmacy.id, address) };
  } catch (e) {
    return { ok: false, error: e instanceof AppError ? e.message : "Could not work out the delivery cost" };
  }
}
