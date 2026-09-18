import type { ServiceClient } from "@getmed/db/service";
import type { OrderStatus, OrderType } from "@getmed/db/types";

/** Orders visible to a pharmacy: only phone-verified submissions. */
export function visibleOrders(db: ServiceClient, pharmacyId: string) {
  return db.from("orders").select("*").eq("pharmacy_id", pharmacyId).not("phone_verified_at", "is", null);
}

export type OrderFilters = { status?: OrderStatus | ""; type?: OrderType | ""; from?: string; to?: string; q?: string };

export async function listOrders(db: ServiceClient, pharmacyId: string, f: OrderFilters) {
  let q = visibleOrders(db, pharmacyId).order("created_at", { ascending: false }).limit(200);
  if (f.status) q = q.eq("status", f.status);
  if (f.type) q = q.eq("order_type", f.type);
  if (f.from) q = q.gte("created_at", new Date(f.from).toISOString());
  if (f.to) q = q.lte("created_at", new Date(`${f.to}T23:59:59`).toISOString());
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    q = digits.length >= 4 ? q.or(`patient_name.ilike.%${f.q}%,patient_phone.ilike.%${digits}%`) : q.ilike("patient_name", `%${f.q}%`);
  }
  const { data } = await q;
  return data ?? [];
}

export async function dashboardStats(db: ServiceClient, pharmacyId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [pendingRes, todayRes, weekRes, consultsRes, deliveredRes, acceptedRes] = await Promise.all([
    visibleOrders(db, pharmacyId).eq("status", "pending"),
    visibleOrders(db, pharmacyId).gte("created_at", startOfDay),
    visibleOrders(db, pharmacyId).gte("created_at", weekAgo),
    db.from("consultation_requests").select("id", { count: "exact", head: true }).eq("pharmacy_id", pharmacyId).eq("status", "new").not("phone_verified_at", "is", null),
    db.from("orders").select("delivery_fee_charged").eq("pharmacy_id", pharmacyId).eq("status", "delivered").gte("delivered_at", monthStart),
    db.from("orders").select("phone_verified_at, accepted_at").eq("pharmacy_id", pharmacyId).not("accepted_at", "is", null).gte("created_at", weekAgo),
  ]);

  const accepted = acceptedRes.data ?? [];
  const avgAcceptMin =
    accepted.length > 0
      ? accepted.reduce((s, o) => s + (new Date(o.accepted_at!).getTime() - new Date(o.phone_verified_at!).getTime()) / 60000, 0) / accepted.length
      : null;

  return {
    pending: pendingRes.data ?? [],
    todayCount: todayRes.data?.length ?? 0,
    weekCount: weekRes.data?.length ?? 0,
    pendingConsults: consultsRes.count ?? 0,
    monthOwed: (deliveredRes.data ?? []).reduce((s, o) => s + Number(o.delivery_fee_charged ?? 0), 0),
    monthDelivered: deliveredRes.data?.length ?? 0,
    avgAcceptMin,
  };
}
