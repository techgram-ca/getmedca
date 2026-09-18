import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatDate, shortId } from "@getmed/core/format";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";
import { DriverActiveToggle } from "@/components/driver-active-toggle";
import { adminOrders, withNames } from "@/lib/queries";

export default async function DriverDetail({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const { db } = await requireAdmin();
  const { data: d } = await db.from("drivers").select("*").eq("id", driverId).maybeSingle();
  if (!d) notFound();
  const orders = await withNames(db, (await adminOrders(db).eq("assigned_driver_id", d.id).order("created_at", { ascending: false }).limit(100)).data ?? []);
  return (
    <div>
      <PageHeader title={<span className="flex items-center gap-3">{d.name}<Badge tone={d.active ? "success" : "neutral"}>{d.active ? "Active" : "Inactive"}</Badge></span>} description={`${d.phone} · ${d.email}`} actions={<DriverActiveToggle driverId={d.id} active={d.active} />} />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="self-start">
          <CardHeader><CardTitle>Vehicle & documents</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "No vehicle info"}{d.vehicle_plate ? ` · ${d.vehicle_plate}` : ""}</p>
            <div className="flex flex-col gap-2">
              {d.license_doc_path ? <Button asChild size="sm" variant="outline"><a href={`/api/drivers/${d.id}/file?kind=license`} target="_blank" rel="noreferrer"><FileText /> Driver's licence</a></Button> : <span className="text-xs text-ink-500">No licence uploaded</span>}
              {d.insurance_doc_path ? <Button asChild size="sm" variant="outline"><a href={`/api/drivers/${d.id}/file?kind=insurance`} target="_blank" rel="noreferrer"><FileText /> Insurance</a></Button> : <span className="text-xs text-ink-500">No insurance uploaded</span>}
            </div>
            <p className="text-xs text-ink-500">Created {formatDate(d.created_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Order history ({orders.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead><TR><TH>Order</TH><TH>Pharmacy</TH><TH>Status</TH><TH>Assigned</TH></TR></THead>
              <TBody>{orders.map((o) => <TR key={o.id}><TD className="font-mono"><Link href={`/orders/${o.id}`} className="hover:text-brand-700">{shortId(o.id)}</Link></TD><TD>{o.pharmacy?.name}</TD><TD><StatusBadge status={o.status} /></TD><TD className="text-ink-500">{formatDate(o.assigned_at)}</TD></TR>)}{orders.length === 0 ? <TR><TD colSpan={4} className="text-center text-ink-500">No orders yet.</TD></TR> : null}</TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Button asChild variant="link" className="mt-6"><Link href="/drivers">← Drivers</Link></Button>
    </div>
  );
}
