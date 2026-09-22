import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, Car, ClipboardList, MessageSquare } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatCurrency, shortId, timeAgo } from "@getmed/core/format";
import { Button, Card, CardContent, EmptyState, PageHeader, Stat, StatusBadge } from "@getmed/ui";
import { adminOrders, escalationReason, withNames } from "@/lib/queries";

export default async function OverviewPage() {
  const { db } = await requireAdmin();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [{ data: esc }, { data: pendingPh }, { count: activeOrders }, { count: drivers }, { count: consults }, { data: delivered }] = await Promise.all([
    adminOrders(db).not("escalated_at", "is", null).neq("escalation_status", "resolved").order("escalated_at", { ascending: false }).limit(8),
    db.from("pharmacies").select("id, name, city, submitted_at").eq("status", "pending").not("submitted_at", "is", null).order("submitted_at").limit(8),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "accepted", "ready_for_delivery", "assigned", "picked_up"]).not("phone_verified_at", "is", null),
    db.from("drivers").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("consultation_requests").select("id", { count: "exact", head: true }).eq("status", "new").not("phone_verified_at", "is", null),
    // Billed from order_charges so failed attempts and retries are counted once each.
    db.from("order_charges").select("amount").gte("created_at", monthStart),
  ]);
  const escalations = await withNames(db, esc ?? []);
  const revenue = (delivered ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div>
      <PageHeader title="Overview" description="Platform health at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pending pharmacy approvals" value={pendingPh?.length ?? 0} tone={pendingPh?.length ? "warning" : "neutral"} icon={<Building2 />} />
        <Stat label="Open escalations" value={escalations.length} tone={escalations.length ? "danger" : "neutral"} icon={<AlertTriangle />} />
        <Stat label="Active orders" value={activeOrders ?? 0} icon={<ClipboardList />} />
        <Stat label="Revenue this month" value={formatCurrency(revenue)} hint={`${delivered?.length ?? 0} delivered · ${drivers ?? 0} active drivers · ${consults ?? 0} new consults`} tone="brand" icon={<Car />} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Pharmacies awaiting review</h2><Button asChild variant="link" size="sm"><Link href="/pharmacies?status=pending">All <ArrowRight /></Link></Button></div>
          {(pendingPh ?? []).length === 0 ? <EmptyState icon={<Building2 />} title="No pending pharmacies" /> : (
            <ul className="space-y-2">
              {(pendingPh ?? []).map((p) => (
                <li key={p.id}><Link href={`/pharmacies/${p.id}`} className="surface flex items-center justify-between p-4 transition-soft hover:shadow-pop"><span><span className="font-medium">{p.name ?? "Unnamed pharmacy"}</span><span className="block text-xs text-ink-500">{p.city ?? ""} · submitted {timeAgo(p.submitted_at!)}</span></span><ArrowRight className="size-4 text-ink-400" /></Link></li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Escalations needing action</h2><Button asChild variant="link" size="sm"><Link href="/escalations">All <ArrowRight /></Link></Button></div>
          {escalations.length === 0 ? <EmptyState icon={<AlertTriangle />} title="Nothing escalated" description="Rejected, cancelled, timed-out and failed orders land here." /> : (
            <ul className="space-y-2">
              {escalations.map((o) => {
                const r = escalationReason(o);
                return (
                  <li key={o.id}>
                    <Card><CardContent className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><Link href={`/orders/${o.id}`} className="font-mono text-sm font-semibold hover:text-brand-700">{shortId(o.id)}</Link><StatusBadge status={o.status} /><span className="text-xs text-ink-500">{timeAgo(o.escalated_at!)}</span></div>
                        <p className="mt-1 text-sm">{o.patient_name} · {o.patient_phone} · {o.pharmacy?.name}</p>
                        <p className="text-xs text-ink-500">{r.kind}{r.text ? `: ${r.text}` : ""}</p>
                      </div>
                      <Button asChild size="sm" variant="outline"><Link href={`/orders/${o.id}`}>Handle</Link></Button>
                    </CardContent></Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <div className="mt-8"><Button asChild variant="secondary"><Link href="/consultations"><MessageSquare /> {consults ?? 0} new consultation requests</Link></Button></div>
    </div>
  );
}
