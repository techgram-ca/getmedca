import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { shortId, timeAgo } from "@getmed/core/format";
import { Badge, Button, EmptyState, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";
import { adminOrders, escalationReason, withNames } from "@/lib/queries";

export default async function EscalationsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const { db } = await requireAdmin();
  let q = adminOrders(db).not("escalated_at", "is", null).order("escalated_at", { ascending: false }).limit(300);
  if (show !== "all") q = q.neq("escalation_status", "resolved");
  const rows = await withNames(db, (await q).data ?? []);
  return (
    <div>
      <PageHeader title="Escalations" description="Rejected, cancelled, timed-out and failed deliveries. You contact the patient — pharmacies and drivers never do." actions={<Button asChild variant={show === "all" ? "secondary" : "ghost"} size="sm"><Link href={show === "all" ? "/escalations" : "/escalations?show=all"}>{show === "all" ? "Hide resolved" : "Show resolved"}</Link></Button>} />
      {rows.length === 0 ? <EmptyState icon={<AlertTriangle />} title="No open escalations" /> : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Order</TH><TH>Patient</TH><TH>Pharmacy</TH><TH>Reason</TH><TH>Since</TH><TH>Handling</TH><TH></TH></TR></THead>
            <TBody>
              {rows.map((o) => {
                const r = escalationReason(o);
                return (
                  <TR key={o.id}>
                    <TD><span className="font-mono font-medium">{shortId(o.id)}</span><div className="mt-0.5"><StatusBadge status={o.status} /></div></TD>
                    <TD><div>{o.patient_name}</div><a href={`tel:${o.patient_phone}`} className="text-xs text-brand-700">{o.patient_phone}</a></TD>
                    <TD>{o.pharmacy?.name ?? "—"}</TD>
                    <TD className="max-w-xs"><div className="font-medium">{r.kind}</div>{r.text ? <div className="text-xs text-ink-500">{r.text}</div> : null}</TD>
                    <TD className="text-ink-500">{timeAgo(o.escalated_at!)}</TD>
                    <TD><Badge tone={o.escalation_status === "resolved" ? "success" : o.escalation_status === "contacted" ? "info" : "warning"} className="capitalize">{o.escalation_status ?? "open"}</Badge></TD>
                    <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/orders/${o.id}`}>Handle</Link></Button></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
