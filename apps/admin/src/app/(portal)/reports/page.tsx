import { requireAdmin } from "@getmed/core/auth";
import { formatCurrency } from "@getmed/core/format";
import { DELIVERY_TYPES, deliveryTypeLabel } from "@getmed/core/pricing";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Stat, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";
import { ReportsCharts } from "@/components/reports-charts";

export default async function ReportsPage() {
  const { db } = await requireAdmin();
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [{ data: orders }, { data: pharmacies }, { data: consults }, { data: charges }] = await Promise.all([
    db.from("orders_admin").select("id, pharmacy_id, status, source, delivery_type, created_at, delivered_at, delivery_fee_charged").gte("created_at", since),
    db.from("pharmacies").select("id, name, status, approved_at").not("submitted_at", "is", null),
    db.from("consultation_requests").select("id, created_at").gte("created_at", since).not("phone_verified_at", "is", null),
    // Revenue comes from the charges, not the orders: a failed attempt bills
    // too, and an order sent out again bills once per trip.
    db.from("order_charges").select("kind, amount, delivery_type, created_at").gte("created_at", since),
  ]);

  // Daily series (last 90 days)
  const days: Record<string, { date: string; orders: number; delivered: number; revenue: number; consultations: number }> = {};
  const key = (d: string) => d.slice(0, 10);
  for (let i = 89; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); days[d] = { date: d, orders: 0, delivered: 0, revenue: 0, consultations: 0 }; }
  for (const o of orders ?? []) { const d = days[key(o.created_at)]; if (d) d.orders++; if (o.delivered_at && days[key(o.delivered_at)]) days[key(o.delivered_at)]!.delivered++; }
  for (const c of charges ?? []) { const d = days[key(c.created_at)]; if (d) d.revenue += Number(c.amount ?? 0); }
  for (const c of consults ?? []) { const d = days[key(c.created_at)]; if (d) d.consultations++; }
  const series = Object.values(days);

  // Pharmacy growth by month (approved)
  const growth: Record<string, number> = {};
  for (const p of pharmacies ?? []) if (p.approved_at) { const m = p.approved_at.slice(0, 7); growth[m] = (growth[m] ?? 0) + 1; }
  let cum = 0;
  const growthSeries = Object.keys(growth).sort().map((m) => ({ month: m, approved: (cum += growth[m]!) }));

  // Quality per pharmacy: distinguish "declines often" vs "accepts then cancels"
  const byPh: Record<string, { total: number; rejected: number; timed_out: number; cancelled: number; delivered: number }> = {};
  for (const o of orders ?? []) { const b = (byPh[o.pharmacy_id] ??= { total: 0, rejected: 0, timed_out: 0, cancelled: 0, delivered: 0 }); b.total++; if (o.status in b) (b as Record<string, number>)[o.status]!++; }
  const names = new Map((pharmacies ?? []).map((p) => [p.id, p.name ?? "—"]));
  const quality = Object.entries(byPh).map(([id, b]) => ({ id, name: names.get(id) ?? "—", ...b, declineRate: b.total ? (b.rejected + b.timed_out) / b.total : 0, cancelRate: b.total ? b.cancelled / b.total : 0 })).sort((a, b) => b.total - a.total);

  const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);

  // Revenue split by the delivery type chosen when the driver was assigned.
  const byType = new Map<string, { count: number; revenue: number }>();
  for (const c of charges ?? []) {
    // Failed attempts bill at their own rate, so they get their own row rather
    // than distorting a delivery tier's average.
    const key = c.kind === "failed_delivery" ? "failed" : c.delivery_type ?? "uncategorised";
    const entry = byType.get(key) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(c.amount ?? 0);
    byType.set(key, entry);
  }
  const typeRows = [...DELIVERY_TYPES.map((t) => t.id), "uncategorised", "failed"]
    .filter((key) => byType.has(key))
    .map((key) => ({
      key,
      label: key === "uncategorised" ? "Uncategorised" : key === "failed" ? "Failed attempts" : deliveryTypeLabel(key as never),
      ...byType.get(key)!,
    }));
  return (
    <div>
      <PageHeader title="Reports" description="Last 90 days." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={orders?.length ?? 0} hint={`${(orders ?? []).filter((o) => o.source === "manual").length} entered manually by pharmacies`} />
        <Stat label="Delivered" value={series.reduce((s, d) => s + d.delivered, 0)} />
        <Stat label="Revenue (flat fees)" value={formatCurrency(totalRevenue)} tone="brand" />
        <Stat label="Consultations" value={consults?.length ?? 0} />
      </div>
      <ReportsCharts series={series} growth={growthSeries} />
      <Card className="mt-6">
        <CardHeader><CardTitle>Revenue by delivery type</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Delivery type</TH><TH>Deliveries</TH><TH>Share</TH><TH className="text-right">Revenue</TH></TR></THead>
            <TBody>
              {typeRows.map((r) => (
                <TR key={r.key}>
                  <TD className="font-medium">{r.label}</TD>
                  <TD>{r.count}</TD>
                  <TD className="text-ink-500">{totalRevenue > 0 ? `${Math.round((r.revenue / totalRevenue) * 100)}%` : "—"}</TD>
                  <TD className="text-right font-semibold">{formatCurrency(r.revenue)}</TD>
                </TR>
              ))}
              {typeRows.length === 0 ? <TR><TD colSpan={4} className="text-center text-ink-500">No deliveries in range.</TD></TR> : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Pharmacy quality</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Pharmacy</TH><TH>Orders</TH><TH>Delivered</TH><TH>Decline rate</TH><TH>Accept-then-cancel</TH></TR></THead>
            <TBody>{quality.map((q) => <TR key={q.id}><TD className="font-medium">{q.name}</TD><TD>{q.total}</TD><TD>{q.delivered}</TD><TD className={q.declineRate > 0.2 ? "text-danger-500" : ""}>{Math.round(q.declineRate * 100)}% <span className="text-xs text-ink-400">({q.rejected} rejected, {q.timed_out} timed out)</span></TD><TD className={q.cancelRate > 0.1 ? "text-danger-500" : ""}>{Math.round(q.cancelRate * 100)}% <span className="text-xs text-ink-400">({q.cancelled})</span></TD></TR>)}{quality.length === 0 ? <TR><TD colSpan={5} className="text-center text-ink-500">No orders in range.</TD></TR> : null}</TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
