import type { ServiceClient } from "@getmed/db/service";
import type { OrderAdminRow } from "@getmed/db/types";

/**
 * ALL admin order reads go through the `orders_admin` view — a PHI-free
 * projection. Prescription, insurance, health card, DOB and street address
 * columns do not exist on it, so they cannot leak into an admin response.
 */
export function adminOrders(db: ServiceClient) {
  return db.from("orders_admin").select("*");
}

export type AdminOrder = OrderAdminRow & { pharmacy?: { name: string | null } | null; driver?: { name: string } | null };

export async function withNames(db: ServiceClient, rows: OrderAdminRow[]): Promise<AdminOrder[]> {
  const pharmacyIds = [...new Set(rows.map((r) => r.pharmacy_id))];
  const driverIds = [...new Set(rows.map((r) => r.assigned_driver_id).filter((x): x is string => !!x))];
  const [{ data: ph }, { data: dr }] = await Promise.all([
    pharmacyIds.length ? db.from("pharmacies").select("id, name").in("id", pharmacyIds) : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    driverIds.length ? db.from("drivers").select("id, name").in("id", driverIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const pm = new Map((ph ?? []).map((p) => [p.id, p]));
  const dm = new Map((dr ?? []).map((d) => [d.id, d]));
  return rows.map((r) => ({ ...r, pharmacy: pm.get(r.pharmacy_id) ?? null, driver: r.assigned_driver_id ? dm.get(r.assigned_driver_id) ?? null : null }));
}

export function escalationReason(o: OrderAdminRow): { kind: string; text: string | null } {
  switch (o.status) {
    case "rejected": return { kind: "Rejected", text: o.rejection_reason };
    case "cancelled": return { kind: "Cancelled after accepting", text: o.cancellation_reason };
    case "timed_out": return { kind: "No response in 30 min", text: null };
    case "failed": return { kind: "Delivery failed", text: o.failure_reason };
    default: return { kind: o.status, text: null };
  }
}
