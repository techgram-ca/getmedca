import type { ServiceClient } from "@getmed/db/service";
import type { DeliveryZone, OrderChargeKind } from "@getmed/db/types";
import { DELIVERY_ZONES, zoneLabel } from "../pricing";

export type InvoiceLine = {
  orderId: string;
  /** When the charge was raised — the delivery, or the attempt that failed. */
  deliveredAt: string;
  fee: number;
  type: DeliveryZone | null;
  kind: OrderChargeKind;
  /** Which trip this line bills. 1 unless the order was sent out again. */
  attempt: number;
};

/** One row per delivery type used in the period. */
export type InvoiceBreakdownRow = {
  type: DeliveryZone | "uncategorised" | "failed";
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
  /** Attempts that failed and were billed. Zero when none, or when the rate is 0%. */
  failedCount: number;
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
  const order: (DeliveryZone | "uncategorised")[] = [...DELIVERY_ZONES.map((t) => t.id), "uncategorised"];
  const groups = new Map<DeliveryZone | "uncategorised", InvoiceLine[]>();
  // Failed attempts are billed at a different rate from completed deliveries,
  // so they get their own row rather than distorting a delivery tier's unit price.
  const failed = lines.filter((l) => l.kind === "failed_delivery");
  for (const line of lines.filter((l) => l.kind !== "failed_delivery")) {
    const key = line.type ?? "uncategorised";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  const rows: InvoiceBreakdownRow[] = order
    .filter((key) => groups.has(key))
    .map((key) => {
      const group = groups.get(key)!;
      const fees = new Set(group.map((r) => r.fee));
      return {
        type: key,
        label: key === "uncategorised" ? "Uncategorised" : zoneLabel(key),
        count: group.length,
        subtotal: round2(group.reduce((sum, r) => sum + r.fee, 0)),
        unitPrice: fees.size === 1 ? [...fees][0]! : null,
      };
    });
  if (failed.length) {
    const fees = new Set(failed.map((r) => r.fee));
    rows.push({
      type: "failed",
      label: "Failed delivery attempts",
      count: failed.length,
      subtotal: round2(failed.reduce((sum, r) => sum + r.fee, 0)),
      unitPrice: fees.size === 1 ? [...fees][0]! : null,
    });
  }
  return rows;
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

  // Billed from order_charges, not from the orders themselves: an order retried
  // after a failed attempt is charged once per trip.
  const { data: charges } = await db
    .from("order_charges")
    .select("order_id, kind, amount, delivery_type, attempt, created_at")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", bounds.start.toISOString())
    .lt("created_at", bounds.end.toISOString())
    .order("created_at", { ascending: true });

  const lines: InvoiceLine[] = (charges ?? []).map((c) => ({
    orderId: c.order_id,
    deliveredAt: c.created_at,
    fee: Number(c.amount),
    type: c.delivery_type,
    kind: c.kind,
    attempt: c.attempt,
  }));

  return {
    id,
    pharmacyId,
    pharmacyName: pharmacy.name ?? "Pharmacy",
    periodStart: bounds.start.toISOString(),
    periodEnd: new Date(bounds.end.getTime() - 1).toISOString(),
    deliveredCount: lines.filter((l) => l.kind === "delivery").length,
    failedCount: lines.filter((l) => l.kind === "failed_delivery").length,
    total: round2(lines.reduce((s, l) => s + l.fee, 0)),
    breakdown: buildBreakdown(lines),
    lines,
  };
}

/** List of months (newest first) since the pharmacy's first billable event. */
export async function listInvoiceMonths(db: ServiceClient, pharmacyId: string): Promise<InvoiceSummary[]> {
  const { data: first } = await db
    .from("order_charges")
    .select("created_at")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const start = first?.created_at ? new Date(first.created_at) : new Date();
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
