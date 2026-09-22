import type { ServiceClient } from "@getmed/db/service";
import type { DeliveryType } from "@getmed/db/types";
import { DELIVERY_TYPES, deliveryTypeLabel } from "../pricing";

export type InvoiceLine = { orderId: string; deliveredAt: string; fee: number; type: DeliveryType | null };

/** One row per delivery type used in the period. */
export type InvoiceBreakdownRow = {
  type: DeliveryType | "uncategorised";
  label: string;
  count: number;
  subtotal: number;
  /** Price per delivery when every order of this type was charged the same. */
  unitPrice: number | null;
};

export type InvoiceSummary = {
  id: string; // YYYY-MM
  pharmacyId: string;
  pharmacyName: string;
  periodStart: string;
  periodEnd: string;
  deliveredCount: number;
  total: number;
  breakdown: InvoiceBreakdownRow[];
  lines: InvoiceLine[];
};

export function monthBounds(id: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(id);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return null;
  return { start: new Date(Date.UTC(y, mo, 1)), end: new Date(Date.UTC(y, mo + 1, 1)) };
}

export function monthId(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Group delivered orders by delivery type. Orders delivered before delivery
 * types existed have no type and are reported separately rather than being
 * folded into a tier they were never priced at.
 */
export function buildBreakdown(lines: InvoiceLine[]): InvoiceBreakdownRow[] {
  const order: (DeliveryType | "uncategorised")[] = [...DELIVERY_TYPES.map((t) => t.id), "uncategorised"];
  const groups = new Map<DeliveryType | "uncategorised", InvoiceLine[]>();
  for (const line of lines) {
    const key = line.type ?? "uncategorised";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return order
    .filter((key) => groups.has(key))
    .map((key) => {
      const rows = groups.get(key)!;
      const fees = new Set(rows.map((r) => r.fee));
      return {
        type: key,
        label: key === "uncategorised" ? "Uncategorised" : deliveryTypeLabel(key),
        count: rows.length,
        subtotal: round2(rows.reduce((sum, r) => sum + r.fee, 0)),
        unitPrice: fees.size === 1 ? [...fees][0]! : null,
      };
    });
}

/**
 * A pharmacy's monthly invoice: only DELIVERED orders are billable, each at
 * the price snapshotted when the admin set its delivery type.
 */
export async function buildInvoice(db: ServiceClient, pharmacyId: string, id: string): Promise<InvoiceSummary | null> {
  const bounds = monthBounds(id);
  if (!bounds) return null;
  const { data: pharmacy } = await db.from("pharmacies").select("id, name").eq("id", pharmacyId).maybeSingle();
  if (!pharmacy) return null;

  const { data: orders } = await db
    .from("orders")
    .select("id, delivered_at, delivery_fee_charged, delivery_type")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "delivered")
    .gte("delivered_at", bounds.start.toISOString())
    .lt("delivered_at", bounds.end.toISOString())
    .order("delivered_at", { ascending: true });

  const lines: InvoiceLine[] = (orders ?? []).map((o) => ({
    orderId: o.id,
    deliveredAt: o.delivered_at!,
    fee: Number(o.delivery_fee_charged ?? 0),
    type: o.delivery_type,
  }));

  return {
    id,
    pharmacyId,
    pharmacyName: pharmacy.name ?? "Pharmacy",
    periodStart: bounds.start.toISOString(),
    periodEnd: new Date(bounds.end.getTime() - 1).toISOString(),
    deliveredCount: lines.length,
    total: round2(lines.reduce((s, l) => s + l.fee, 0)),
    breakdown: buildBreakdown(lines),
    lines,
  };
}

/** List of months (newest first) since the pharmacy's first delivered order. */
export async function listInvoiceMonths(db: ServiceClient, pharmacyId: string): Promise<InvoiceSummary[]> {
  const { data: first } = await db
    .from("orders")
    .select("delivered_at")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "delivered")
    .order("delivered_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const start = first?.delivered_at ? new Date(first.delivered_at) : new Date();
  const months: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const now = new Date();
  while (cursor <= now && months.length < 36) {
    months.push(monthId(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const out: InvoiceSummary[] = [];
  for (const m of months.reverse()) {
    const inv = await buildInvoice(db, pharmacyId, m);
    if (inv) out.push(inv);
  }
  return out;
}
