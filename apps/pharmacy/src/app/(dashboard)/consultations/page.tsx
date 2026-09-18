import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatDate, timeAgo } from "@getmed/core/format";
import { Badge, Button, EmptyState, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { pharmacy, db } = await requirePharmacy();
  let q = db
    .from("consultation_requests")
    .select("*, issues(name), pharmacy_services(name)")
    .eq("pharmacy_id", pharmacy.id)
    .not("phone_verified_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status as "new");
  const { data: rows } = await q;
  type Row = NonNullable<typeof rows>[number] & { issues: { name: string } | null; pharmacy_services: { name: string } | null };
  const list = (rows ?? []) as Row[];

  return (
    <div>
      <PageHeader
        title="Consultation requests"
        description="Patients expecting a call from a pharmacist."
        actions={
          <div className="flex gap-1">
            {["", "new", "contacted", "resolved"].map((s) => (
              <Button key={s} asChild size="sm" variant={(status ?? "") === s ? "secondary" : "ghost"}><Link href={s ? `/consultations?status=${s}` : "/consultations"}>{s || "All"}</Link></Button>
            ))}
          </div>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title="No consultation requests" description="Requests from patients will appear here." />
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Patient</TH><TH>Topic</TH><TH>Callback</TH><TH>Status</TH><TH>Received</TH><TH></TH></TR></THead>
            <TBody>
              {list.map((r) => (
                <TR key={r.id}>
                  <TD><div>{r.patient_name}</div><div className="text-xs text-ink-500">{r.patient_phone}</div></TD>
                  <TD>{r.issues?.name ?? r.pharmacy_services?.name ?? "—"}</TD>
                  <TD className="capitalize">{r.callback_window ? <Badge>{r.callback_window}</Badge> : "Any"}</TD>
                  <TD><StatusBadge status={r.status} /></TD>
                  <TD className="text-ink-500" title={formatDate(r.created_at)}>{timeAgo(r.created_at)}</TD>
                  <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/consultations/${r.id}`}>Open</Link></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
