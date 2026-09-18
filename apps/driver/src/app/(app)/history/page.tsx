import { requireDriver } from "@getmed/core/auth";
import { formatDate, shortId } from "@getmed/core/format";
import { EmptyState, StatusBadge } from "@getmed/ui";
import { History } from "lucide-react";

export default async function HistoryPage() {
  const { driver, db } = await requireDriver();
  const { data } = await db.from("orders_driver").select("id, status, patient_name, delivery_city, pharmacy_name, delivered_at, failed_at, updated_at").eq("assigned_driver_id", driver.id).in("status", ["delivered", "failed"]).order("updated_at", { ascending: false }).limit(100);
  const list = data ?? [];
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Past deliveries</h1>
      {list.length === 0 ? <EmptyState icon={<History />} title="No completed deliveries yet" /> : (
        <ul className="divide-y divide-ink-100 surface">
          {list.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="font-mono text-sm font-medium">{shortId(o.id)}</p><p className="truncate text-xs text-ink-500">{o.pharmacy_name} → {o.patient_name}, {o.delivery_city}</p><p className="text-xs text-ink-400">{formatDate(o.delivered_at ?? o.failed_at ?? o.updated_at)}</p></div>
              <StatusBadge status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
