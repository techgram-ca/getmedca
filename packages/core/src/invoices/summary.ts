import type { ServiceClient } from "@getmed/db/service";

export type InvoiceLine = { orderId: string; deliveredAt: string; fee: number };
export type InvoiceSummary = {
  id: string; // YYYY-MM
  pharmacyId: string;
  pharmacyName: string;
  periodStart: string;
  periodEnd: string;
  deliveredCount: number;
  /** Flat fee at time of delivery. When fees changed mid-month this is the most common value. */
  flatFee: number;
  total: number;
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

/**
 * FLAT FEE MODEL: total = Σ delivery_fee_charged over DELIVERED orders in the
 * month. The per-order snapshot keeps history accurate if the fee changes.
 */
export async function buildInvoice(db: ServiceClient, pharmacyId: string, id: string): Promise<InvoiceSummary | null> {
  const bounds = monthBounds(id);
  if (!bounds) return null;
  const { data: pharmacy } = await db.from("pharmacies").select("id, name").eq("id", pharmacyId).maybeSingle();
  if (!pharmacy) return null;
  const { data: orders } = await db
    .from("orders")
    .select("id, delivered_at, delivery_fee_charged")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "delivered")
    .gte("delivered_at", bounds.start.toISOString())
    .lt("delivered_at", bounds.end.toISOString())
    .order("delivered_at", { ascending: true });
  const lines: InvoiceLine[] = (orders ?? []).map((o) => ({
    orderId: o.id,
    deliveredAt: o.delivered_at!,
    fee: Number(o.delivery_fee_charged ?? 0),
  }));
  const total = lines.reduce((s, l) => s + l.fee, 0);
  const feeCounts = new Map<number, number>();
  for (const l of lines) feeCounts.set(l.fee, (feeCounts.get(l.fee) ?? 0) + 1);
  const flatFee = [...feeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  return {
    id,
    pharmacyId,
    pharmacyName: pharmacy.name ?? "Pharmacy",
    periodStart: bounds.start.toISOString(),
    periodEnd: new Date(bounds.end.getTime() - 1).toISOString(),
    deliveredCount: lines.length,
    flatFee,
    total: Math.round(total * 100) / 100,
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
