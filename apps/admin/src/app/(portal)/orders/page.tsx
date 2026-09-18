import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatDate, shortId } from "@getmed/core/format";
import type { OrderStatus } from "@getmed/db/types";
import { Badge, Button, EmptyState, Input, PageHeader, Select, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";
import { adminOrders, withNames } from "@/lib/queries";

const STATUSES: OrderStatus[] = ["pending", "accepted", "ready_for_delivery", "assigned", "picked_up", "delivered", "failed", "rejected", "cancelled", "timed_out"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; pharmacy?: string; source?: string; q?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  let q = adminOrders(db).order("created_at", { ascending: false }).limit(300);
  if (sp.status) q = q.eq("status", sp.status as OrderStatus);
  if (sp.pharmacy) q = q.eq("pharmacy_id", sp.pharmacy);
  if (sp.source === "online" || sp.source === "manual") q = q.eq("source", sp.source);
  if (sp.from) q = q.gte("created_at", new Date(sp.from).toISOString());
  if (sp.to) q = q.lte("created_at", new Date(`${sp.to}T23:59:59`).toISOString());
  if (sp.q) q = q.or(`patient_name.ilike.%${sp.q}%,patient_phone.ilike.%${sp.q.replace(/\D/g, "") || sp.q}%`);
  const rows = await withNames(db, (await q).data ?? []);
  const { data: pharmacies } = await db.from("pharmacies").select("id, name").not("submitted_at", "is", null).order("name");

  return (
    <div>
      <PageHeader title="Orders" description="Metadata only — prescription, insurance and health-card details are never available here." />
      <form className="surface mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-7" method="get">
        <Select name="status" defaultValue={sp.status ?? ""}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>
        <Select name="pharmacy" defaultValue={sp.pharmacy ?? ""}><option value="">All pharmacies</option>{(pharmacies ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Select name="source" defaultValue={sp.source ?? ""}><option value="">Online + manual</option><option value="online">Online</option><option value="manual">Manual</option></Select>
        <Input type="date" name="from" defaultValue={sp.from} /><Input type="date" name="to" defaultValue={sp.to} />
        <Input name="q" defaultValue={sp.q} placeholder="Patient name / phone" />
        <div className="flex gap-2"><Button type="submit" className="flex-1">Filter</Button><Button asChild variant="ghost"><Link href="/orders">Clear</Link></Button></div>
      </form>
      {rows.length === 0 ? <EmptyState icon={<ClipboardList />} title="No orders match" /> : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Order</TH><TH>Patient</TH><TH>Pharmacy</TH><TH>Driver</TH><TH>Status</TH><TH>Created</TH><TH></TH></TR></THead>
            <TBody>
              {rows.map((o) => (
                <TR key={o.id}>
                  <TD className="font-mono font-medium">{shortId(o.id)}<div className="flex items-center gap-1 text-[10px] uppercase text-ink-400">{o.order_type}{o.source === "manual" ? <Badge tone="accent" className="px-1.5 py-0 text-[9px]">Manual</Badge> : null}</div></TD>
                  <TD><div>{o.patient_name}</div><div className="text-xs text-ink-500">{o.patient_phone}</div></TD>
                  <TD>{o.pharmacy?.name ?? "—"}</TD><TD>{o.driver?.name ?? "—"}</TD>
                  <TD><StatusBadge status={o.status} /></TD>
                  <TD className="text-ink-500">{formatDate(o.created_at)}</TD>
                  <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/orders/${o.id}`}>View</Link></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
