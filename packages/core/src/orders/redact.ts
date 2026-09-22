import type { OrderAdminRow, OrderRow } from "@getmed/db/types";

/** Keys the admin portal is allowed to receive. Everything else is PHI and is stripped. */
export const ADMIN_ORDER_KEYS = [
  "id", "pharmacy_id", "order_type", "status", "patient_name", "patient_phone",
  "delivery_city", "delivery_postal_code", "assigned_driver_id",
  "rejection_reason", "cancellation_reason", "failure_reason",
  "escalated_at", "escalation_status", "escalation_note", "escalation_resolved_at",
  "reassigned_at", "reassigned_by", "delivery_fee_charged",
  "accepted_at", "ready_at", "assigned_at", "picked_up_at", "delivered_at", "failed_at",
  "rejected_at", "cancelled_at", "timed_out_at", "created_at", "updated_at", "source", "delivery_type",
] as const satisfies readonly (keyof OrderAdminRow)[];

/**
 * Structurally reduce a full order to the admin-safe projection. Used by every
 * admin-scoped route handler so the response payload genuinely lacks PHI —
 * prescription files, insurance, health card, DOB and street address never leave the server.
 */
export function redactForAdmin(order: OrderRow): OrderAdminRow {
  const out = {} as Record<string, unknown>;
  for (const k of ADMIN_ORDER_KEYS) out[k] = order[k];
  return out as OrderAdminRow;
}
