import { createServiceClient, type ServiceClient } from "@getmed/db/service";
import type { OrderInsert, OrderRow, OrderStatus } from "@getmed/db/types";
import { AppError, ForbiddenError, InvalidTransitionError, NotFoundError } from "../errors";
import { shortId, statusLabel } from "../format";
import { inngest, orderCreated, orderResponded } from "../inngest/client";
import { adminTarget, notify } from "../notifications/dispatch";
import { getPlatformSettings } from "../settings";
import { ESCALATION_STATUSES, TRANSITIONS, canTransition, type Actor, type OrderAction } from "./state-machine";

type Ctx = { db?: ServiceClient };

function dbOf(ctx: Ctx): ServiceClient {
  return ctx.db ?? createServiceClient();
}

async function loadOrder(db: ServiceClient, orderId: string): Promise<OrderRow> {
  const { data, error } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Order not found");
  return data;
}

async function loadPharmacy(db: ServiceClient, pharmacyId: string) {
  const { data } = await db
    .from("pharmacies")
    .select("id, name, phone, email, address_line, city, notify_sms, notify_email, estimated_delivery_time")
    .eq("id", pharmacyId)
    .maybeSingle();
  return data;
}

async function logEvent(
  db: ServiceClient,
  order: OrderRow,
  action: string,
  to: OrderStatus | null,
  actorRole: string,
  actorId: string | null,
  note?: string | null,
) {
  await db.from("order_events").insert({
    order_id: order.id,
    from_status: order.status,
    to_status: to,
    action,
    actor_role: actorRole,
    actor_id: actorId,
    note: note ?? null,
  });
}

/**
 * Apply a state-machine transition atomically. The UPDATE is guarded by
 * `.eq("status", from)` so two concurrent actors cannot both succeed.
 */
async function transition(
  db: ServiceClient,
  order: OrderRow,
  action: OrderAction,
  actor: Actor,
  actorId: string | null,
  patch: Partial<OrderRow>,
  note?: string | null,
): Promise<OrderRow> {
  if (!canTransition(action, order.status, actor)) {
    throw new InvalidTransitionError(order.status, TRANSITIONS[action].to);
  }
  const to = TRANSITIONS[action].to;
  const { data, error } = await db
    .from("orders")
    .update({ ...patch, status: to })
    .eq("id", order.id)
    .eq("status", order.status)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new InvalidTransitionError(order.status, to);
  await logEvent(db, order, action, to, actor, actorId, note);
  return data;
}

function assertPharmacyOwns(order: OrderRow, pharmacyId: string) {
  if (order.pharmacy_id !== pharmacyId) throw new ForbiddenError("This order belongs to another pharmacy");
}

function assertDriverAssigned(order: OrderRow, driverId: string) {
  if (order.assigned_driver_id !== driverId) throw new ForbiddenError("This order is not assigned to you");
}

async function escalate(db: ServiceClient, order: OrderRow) {
  if (!ESCALATION_STATUSES.includes(order.status)) return order;
  const { data } = await db
    .from("orders")
    .update({ escalated_at: new Date().toISOString(), escalation_status: "open" })
    .eq("id", order.id)
    .select("*")
    .single();
  return data ?? order;
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/** Patient submission (after OTP verification). Starts the SLA timer + notifies pharmacy. */
export async function createOrder(input: OrderInsert, ctx: Ctx = {}): Promise<OrderRow> {
  const db = dbOf(ctx);
  const { data: pharmacy } = await db.from("pharmacies").select("id, status").eq("id", input.pharmacy_id).maybeSingle();
  if (!pharmacy || pharmacy.status !== "approved") throw new AppError("This pharmacy is not accepting orders", 400);

  const { data, error } = await db.from("orders").insert(input).select("*").single();
  if (error) throw error;
  await db.from("order_events").insert({
    order_id: data.id,
    from_status: null,
    to_status: "pending",
    action: "create",
    actor_role: "patient",
  });
  return data;
}

/** Called once the patient's phone is verified: marks verified, notifies pharmacy, starts SLA timer. */
export async function activateOrder(orderId: string, ctx: Ctx = {}): Promise<OrderRow> {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  if (order.phone_verified_at) return order;
  const { data, error } = await db
    .from("orders")
    .update({ phone_verified_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;

  const settings = await getPlatformSettings(db);
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);

  await Promise.all([
    inngest.send(orderCreated.create({ orderId, slaMinutes: settings.sla_minutes })).catch((e) => {
      console.error("[inngest] failed to schedule SLA timer", e instanceof Error ? e.message : e);
    }),
    pharmacy
      ? notify(
          db,
          "order.new",
          { phone: pharmacy.notify_sms ? pharmacy.phone : null, email: pharmacy.notify_email ? pharmacy.email : null },
          { pharmacyName: pharmacy.name, orderId: shortId(orderId), orderType: order.order_type, patientName: order.patient_name },
        )
      : Promise.resolve(),
  ]);
  return data;
}

export async function acceptOrder(orderId: string, pharmacyId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertPharmacyOwns(order, pharmacyId);
  const updated = await transition(db, order, "accept", "pharmacy", pharmacyId, { accepted_at: new Date().toISOString() });
  await inngest.send(orderResponded.create({ orderId })).catch(() => undefined);
  const pharmacy = await loadPharmacy(db, pharmacyId);
  await notify(db, "order.status", { phone: order.patient_phone }, {
    orderId: shortId(orderId),
    status: statusLabel("accepted").toLowerCase(),
    pharmacyName: pharmacy?.name,
    estimatedTime: pharmacy?.estimated_delivery_time ?? "same day",
  }, { channels: ["sms"] });
  return updated;
}

export async function rejectOrder(orderId: string, pharmacyId: string, reason: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertPharmacyOwns(order, pharmacyId);
  if (!reason.trim()) throw new AppError("A rejection reason is required");
  let updated = await transition(db, order, "reject", "pharmacy", pharmacyId, {
    rejection_reason: reason.trim(),
    rejected_at: new Date().toISOString(),
  }, reason);
  updated = await escalate(db, updated);
  await inngest.send(orderResponded.create({ orderId })).catch(() => undefined);
  const pharmacy = await loadPharmacy(db, pharmacyId);
  // Admin is notified; the pharmacy never re-contacts the patient.
  await notify(db, "order.rejected", adminTarget(), {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    patientName: order.patient_name,
    patientPhone: order.patient_phone,
    rejectionReason: reason,
  });
  return updated;
}

export async function markReady(orderId: string, pharmacyId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertPharmacyOwns(order, pharmacyId);
  const updated = await transition(db, order, "mark_ready", "pharmacy", pharmacyId, { ready_at: new Date().toISOString() });
  const pharmacy = await loadPharmacy(db, pharmacyId);
  await notify(db, "order.status", { phone: order.patient_phone }, {
    orderId: shortId(orderId),
    status: "ready for delivery",
    pharmacyName: pharmacy?.name,
    estimatedTime: pharmacy?.estimated_delivery_time ?? "same day",
  }, { channels: ["sms"] });
  return updated;
}

export async function cancelOrder(orderId: string, pharmacyId: string, reason: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertPharmacyOwns(order, pharmacyId);
  if (!reason.trim()) throw new AppError("A cancellation reason is required");
  let updated = await transition(db, order, "cancel", "pharmacy", pharmacyId, {
    cancellation_reason: reason.trim(),
    cancelled_at: new Date().toISOString(),
  }, reason);
  updated = await escalate(db, updated);
  const pharmacy = await loadPharmacy(db, pharmacyId);
  await notify(db, "order.cancelled", adminTarget(), {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    patientName: order.patient_name,
    patientPhone: order.patient_phone,
    cancellationReason: reason,
  });
  return updated;
}

/** Admin manually assigns (or re-assigns before pickup) a driver. */
export async function assignDriver(orderId: string, driverId: string, adminId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  const { data: driver } = await db.from("drivers").select("*").eq("id", driverId).eq("active", true).maybeSingle();
  if (!driver) throw new NotFoundError("Driver not found or inactive");
  const updated = await transition(db, order, "assign_driver", "admin", adminId, {
    assigned_driver_id: driverId,
    assigned_at: new Date().toISOString(),
  }, driver.name);
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await notify(db, "driver.assigned", { phone: driver.phone, email: driver.email }, {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    pharmacyAddress: [pharmacy?.address_line, pharmacy?.city].filter(Boolean).join(", "),
    deliveryAddress: [order.delivery_address_line, order.delivery_city].filter(Boolean).join(", "),
  });
  return updated;
}

/** Driver marks pickup. From here the pharmacy has no write access (enforced by the state machine). */
export async function pickUpOrder(orderId: string, driverId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertDriverAssigned(order, driverId);
  const updated = await transition(db, order, "pick_up", "driver", driverId, { picked_up_at: new Date().toISOString() });
  const { data: driver } = await db.from("drivers").select("name").eq("id", driverId).maybeSingle();
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await notify(db, "order.out_for_delivery", { phone: order.patient_phone }, {
    orderId: shortId(orderId),
    driverName: driver?.name,
    estimatedTime: pharmacy?.estimated_delivery_time ?? "shortly",
  }, { channels: ["sms"] });
  return updated;
}

/** Driver completes delivery with proof. Snapshots the platform flat fee onto the order. */
export async function deliverOrder(
  orderId: string,
  driverId: string,
  proof: { photoPath: string; signaturePath: string },
  ctx: Ctx = {},
) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertDriverAssigned(order, driverId);
  const settings = await getPlatformSettings(db);
  const updated = await transition(db, order, "deliver", "driver", driverId, {
    delivered_at: new Date().toISOString(),
    delivery_fee_charged: settings.flat_delivery_fee,
  });
  await db.from("proof_of_delivery").upsert(
    { order_id: orderId, photo_path: proof.photoPath, signature_path: proof.signaturePath, driver_id: driverId },
    { onConflict: "order_id" },
  );
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await Promise.all([
    notify(db, "order.status", { phone: order.patient_phone }, {
      orderId: shortId(orderId),
      status: "delivered",
      pharmacyName: pharmacy?.name,
      estimatedTime: "completed",
    }, { channels: ["sms"] }),
    pharmacy
      ? notify(db, "order.status", { phone: pharmacy.notify_sms ? pharmacy.phone : null, email: pharmacy.notify_email ? pharmacy.email : null }, {
          orderId: shortId(orderId),
          status: "delivered",
          pharmacyName: pharmacy.name,
          estimatedTime: "completed",
        })
      : Promise.resolve(),
  ]);
  return updated;
}

export async function failDelivery(orderId: string, driverId: string, reason: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertDriverAssigned(order, driverId);
  if (!reason.trim()) throw new AppError("A failure reason is required");
  let updated = await transition(db, order, "fail", "driver", driverId, {
    failure_reason: reason.trim(),
    failed_at: new Date().toISOString(),
  }, reason);
  updated = await escalate(db, updated);
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await notify(db, "order.delivery_failed", adminTarget(), {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    patientName: order.patient_name,
    patientPhone: order.patient_phone,
    failureReason: reason,
  });
  return updated;
}

/** System: SLA expired without a pharmacy response. Idempotent. */
export async function timeOutOrder(orderId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  if (order.status !== "pending") return order; // already responded — no-op
  let updated = await transition(db, order, "time_out", "system", null, { timed_out_at: new Date().toISOString() });
  updated = await escalate(db, updated);
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await notify(db, "order.timed_out", adminTarget(), {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    patientName: order.patient_name,
    patientPhone: order.patient_phone,
  });
  return updated;
}

/**
 * Driver-to-driver reassignment. NOT a status change and NO admin gate.
 * Logs reassigned_at / reassigned_by on the order.
 */
export async function reassignDriver(orderId: string, fromDriverId: string, toDriverId: string, ctx: Ctx = {}) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  assertDriverAssigned(order, fromDriverId);
  if (fromDriverId === toDriverId) throw new AppError("Choose a different driver");
  if (!["assigned", "picked_up"].includes(order.status)) throw new AppError("This order can no longer be reassigned", 409);
  const { data: target } = await db.from("drivers").select("*").eq("id", toDriverId).eq("active", true).maybeSingle();
  if (!target) throw new NotFoundError("Driver not found or inactive");
  const { data, error } = await db
    .from("orders")
    .update({ assigned_driver_id: toDriverId, reassigned_at: new Date().toISOString(), reassigned_by: fromDriverId })
    .eq("id", orderId)
    .eq("assigned_driver_id", fromDriverId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Order was reassigned by someone else", 409);
  await logEvent(db, order, "reassign", null, "driver", fromDriverId, `→ ${target.name}`);
  const pharmacy = await loadPharmacy(db, order.pharmacy_id);
  await notify(db, "driver.assigned", { phone: target.phone, email: target.email }, {
    orderId: shortId(orderId),
    pharmacyName: pharmacy?.name,
    pharmacyAddress: [pharmacy?.address_line, pharmacy?.city].filter(Boolean).join(", "),
    deliveryAddress: [order.delivery_address_line, order.delivery_city].filter(Boolean).join(", "),
  });
  return data;
}

/** Admin escalation handling: mark contacted / resolved with an outcome note. */
export async function updateEscalation(
  orderId: string,
  status: "contacted" | "resolved",
  note: string | null,
  adminId: string,
  ctx: Ctx = {},
) {
  const db = dbOf(ctx);
  const order = await loadOrder(db, orderId);
  if (!order.escalated_at) throw new AppError("This order is not escalated", 409);
  const { data, error } = await db
    .from("orders")
    .update({
      escalation_status: status,
      escalation_note: note,
      escalation_resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  await logEvent(db, order, `escalation_${status}`, null, "admin", adminId, note);
  return data;
}
