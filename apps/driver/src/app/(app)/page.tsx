import Link from "next/link";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { requireDriver } from "@getmed/core/auth";
import { shortId, timeAgo } from "@getmed/core/format";
import { EmptyState, StatusBadge } from "@getmed/ui";

export default async function AssignedOrdersPage() {
  const { driver, db } = await requireDriver();
  const { data: orders } = await db.from("orders_driver").select("*").eq("assigned_driver_id", driver.id).in("status", ["assigned", "picked_up"]).order("assigned_at");
  const list = orders ?? [];
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Today's deliveries <span className="text-ink-400">({list.length})</span></h1>
      {list.length === 0 ? <EmptyState icon={<Package />} title="Nothing assigned" description="New deliveries appear here as soon as GetMed assigns them to you." /> : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="surface block p-4 transition-soft active:scale-[0.99]">
                <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{shortId(o.id)}</span><StatusBadge status={o.status} /></div>
                <p className="mt-2 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" /><span><span className="block text-xs uppercase tracking-wide text-ink-500">Pickup</span>{o.pharmacy_name} · {o.pharmacy_address_line}</span></p>
                <p className="mt-2 flex items-start gap-2 text-sm"><ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-400" /><span><span className="block text-xs uppercase tracking-wide text-ink-500">Deliver to</span>{o.patient_name} · {[o.delivery_address_line, o.delivery_city].filter(Boolean).join(", ")}</span></p>
                <p className="mt-2 text-xs text-ink-500">Assigned {timeAgo(o.assigned_at ?? o.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
