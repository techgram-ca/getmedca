import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { Badge, Button, EmptyState, PageHeader, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function DriversPage() {
  const { db } = await requireAdmin();
  const { data: drivers } = await db.from("drivers").select("*").order("active", { ascending: false }).order("name");
  const { data: active } = await db.from("orders_admin").select("assigned_driver_id").in("status", ["assigned", "picked_up"]);
  const load = new Map<string, number>();
  for (const o of active ?? []) if (o.assigned_driver_id) load.set(o.assigned_driver_id, (load.get(o.assigned_driver_id) ?? 0) + 1);
  return (
    <div>
      <PageHeader title="Drivers" actions={<Button asChild><Link href="/drivers/new"><Plus /> New driver</Link></Button>} />
      {(drivers ?? []).length === 0 ? <EmptyState icon={<Car />} title="No drivers yet" action={<Button asChild><Link href="/drivers/new">Create the first driver</Link></Button>} /> : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Driver</TH><TH>Vehicle</TH><TH>Active deliveries</TH><TH>Status</TH><TH></TH></TR></THead>
            <TBody>{(drivers ?? []).map((d) => (
              <TR key={d.id}><TD><div className="font-medium">{d.name}</div><div className="text-xs text-ink-500">{d.phone} · {d.email}</div></TD><TD>{[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "—"}{d.vehicle_plate ? <span className="ml-1 text-xs text-ink-500">({d.vehicle_plate})</span> : null}</TD><TD>{load.get(d.id) ?? 0}</TD><TD><Badge tone={d.active ? "success" : "neutral"}>{d.active ? "Active" : "Inactive"}</Badge></TD><TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/drivers/${d.id}`}>View</Link></Button></TD></TR>
            ))}</TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
