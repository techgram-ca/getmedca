import Link from "next/link";
import { ArrowRight, Clock, DollarSign, Inbox, MessageSquare, Package } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatCurrency, shortId, timeAgo } from "@getmed/core/format";
import { Button, Card, CardContent, EmptyState, PageHeader, Stat, StatusBadge } from "@getmed/ui";
import { OrderActions } from "@/components/order-actions";
import { SlaCountdown } from "@/components/sla-countdown";
import { dashboardStats } from "@/lib/queries";

export default async function DashboardPage() {
  const { pharmacy, db } = await requirePharmacy();
  const s = await dashboardStats(db, pharmacy.id);

  return (
    <div>
      <PageHeader title={`Good ${greeting()}, ${pharmacy.name ?? "there"}`} description="Here's what needs your attention." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="New orders" value={s.pending.length} tone={s.pending.length ? "brand" : "neutral"} hint="Respond within 30 min" icon={<Inbox />} className={s.pending.length ? "animate-pulse-ring" : ""} />
        <Stat label="Today / this week" value={`${s.todayCount} / ${s.weekCount}`} icon={<Package />} />
        <Stat label="Consultations waiting" value={s.pendingConsults} tone={s.pendingConsults ? "warning" : "neutral"} icon={<MessageSquare />} />
        <Stat label="Delivery fees this month" value={formatCurrency(s.monthOwed)} hint={`${s.monthDelivered} delivered`} icon={<DollarSign />} />
        <Stat label="Avg. time to accept" value={s.avgAcceptMin == null ? "—" : `${Math.round(s.avgAcceptMin)} min`} hint="Last 7 days" icon={<Clock />} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New orders queue</h2>
          <Button asChild variant="link" size="sm"><Link href="/orders">All orders <ArrowRight /></Link></Button>
        </div>
        {s.pending.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No new orders" description="New orders appear here instantly with a sound alert." />
        ) : (
          <ul className="space-y-3">
            {s.pending.map((o) => (
              <li key={o.id}>
                <Card className="animate-slide-up">
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/orders/${o.id}`} className="font-mono text-sm font-semibold hover:text-brand-700">{shortId(o.id)}</Link>
                        <StatusBadge status={o.status} />
                        <span className="text-xs uppercase tracking-wide text-ink-500">{o.order_type === "transfer" ? "Transfer" : "New Rx"}</span>
                      </div>
                      <p className="mt-1 text-sm">{o.patient_name} · {o.patient_phone}</p>
                      <p className="text-xs text-ink-500">{[o.delivery_address_line, o.delivery_city].filter(Boolean).join(", ")} · received {timeAgo(o.phone_verified_at ?? o.created_at)}</p>
                    </div>
                    <SlaCountdown since={o.phone_verified_at ?? o.created_at} />
                    <OrderActions orderId={o.id} status={o.status} compact />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Toronto" }).format(new Date()));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
