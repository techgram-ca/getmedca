import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatDate, shortId } from "@getmed/core/format";
import type { OrderStatus, OrderType } from "@getmed/db/types";
import { Button, EmptyState, Input, PageHeader, Select, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";
import { listOrders } from "@/lib/queries";

const STATUSES: OrderStatus[] = ["pending", "accepted", "ready_for_delivery", "assigned", "picked_up", "delivered", "failed", "rejected", "cancelled", "timed_out"];

type Search = { status?: string; type?: string; from?: string; to?: string; q?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { pharmacy, db } = await requirePharmacy();
  const orders = await listOrders(db, pharmacy.id, {
    status: (sp.status as OrderStatus) || "",
    type: (sp.type as OrderType) || "",
    from: sp.from,
    to: sp.to,
    q: sp.q,
  });

  return (
    <div>
      <PageHeader title="Orders" description={`${orders.length} orders`} />
      <form className="surface mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Order type">
          <option value="">All types</option>
          <option value="new">New prescription</option>
          <option value="transfer">Transfer</option>
        </Select>
        <Input type="date" name="from" defaultValue={sp.from} aria-label="From" />
        <Input type="date" name="to" defaultValue={sp.to} aria-label="To" />
        <Input name="q" defaultValue={sp.q} placeholder="Patient name or phone" aria-label="Search" />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Filter</Button>
          <Button asChild variant="ghost"><Link href="/orders">Clear</Link></Button>
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No orders match" />
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Order</TH><TH>Patient</TH><TH>Type</TH><TH>Status</TH><TH>Received</TH><TH></TH></TR></THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-mono font-medium">{shortId(o.id)}</TD>
                  <TD><div>{o.patient_name}</div><div className="text-xs text-ink-500">{o.patient_phone}</div></TD>
                  <TD className="capitalize">{o.order_type}</TD>
                  <TD><StatusBadge status={o.status} /></TD>
                  <TD className="text-ink-500">{formatDate(o.phone_verified_at ?? o.created_at)}</TD>
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
