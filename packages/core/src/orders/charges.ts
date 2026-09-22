import type { ServiceClient } from "@getmed/db/service";
import type { OrderChargeKind, OrderRow } from "@getmed/db/types";
import { getPlatformSettings } from "../settings";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Records a billable event against an order. An order retried after a failed
 * attempt is charged more than once — a failed_delivery row for the trip that
 * failed, then a delivery row for the trip that succeeded — so charges live in
 * their own table rather than in a single column on the order.
 *
 * The unique (order_id, kind, attempt) constraint makes this idempotent: an
 * action replayed on the same attempt updates that row instead of adding one.
 */
async function record(db: ServiceClient, order: OrderRow, kind: OrderChargeKind, amount: number) {
  const { error } = await db.from("order_charges").upsert(
    {
      order_id: order.id,
      pharmacy_id: order.pharmacy_id,
      kind,
      amount: round2(amount),
      delivery_type: order.delivery_type,
      attempt: order.delivery_attempt,
    },
    { onConflict: "order_id,kind,attempt" },
  );
  if (error) throw error;
}

/** Full quoted fee, billed when the driver completes the delivery. */
export async function chargeDelivery(db: ServiceClient, order: OrderRow): Promise<number> {
  const amount = Number(order.delivery_fee_charged ?? 0);
  await record(db, order, "delivery", amount);
  return round2(amount);
}

/**
 * A failed attempt bills a share of the quoted fee — the driver drove the route
 * either way. The share is the admin's `failed_delivery_fee_percent`, and at 0
 * nothing is recorded at all so the invoice does not carry $0.00 noise.
 */
export async function chargeFailedDelivery(db: ServiceClient, order: OrderRow): Promise<number> {
  const settings = await getPlatformSettings(db);
  const percent = Number(settings.failed_delivery_fee_percent ?? 0);
  const amount = round2((Number(order.delivery_fee_charged ?? 0) * percent) / 100);
  if (amount <= 0) return 0;
  await record(db, order, "failed_delivery", amount);
  return amount;
}

export type OrderChargeSummary = { kind: OrderChargeKind; amount: number; attempt: number; createdAt: string };

/** Everything billed against one order, oldest first. */
export async function orderCharges(db: ServiceClient, orderId: string): Promise<OrderChargeSummary[]> {
  const { data } = await db
    .from("order_charges")
    .select("kind, amount, attempt, created_at")
    .eq("order_id", orderId)
    .order("created_at");
  return (data ?? []).map((c) => ({
    kind: c.kind,
    amount: Number(c.amount),
    attempt: c.attempt,
    createdAt: c.created_at,
  }));
}
