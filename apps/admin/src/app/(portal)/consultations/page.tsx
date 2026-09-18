import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { timeAgo } from "@getmed/core/format";
import { Button, EmptyState, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

export default async function AdminConsultations({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { db } = await requireAdmin();
  let q = db.from("consultation_requests").select("id, patient_name, patient_phone, status, created_at, callback_window, pharmacies(name), issues(name)").not("phone_verified_at", "is", null).order("created_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status as "new");
  const { data } = await q;
  type Row = NonNullable<typeof data>[number] & { pharmacies: { name: string | null } | null; issues: { name: string } | null };
  const rows = (data ?? []) as Row[];
  return (
    <div>
      <PageHeader title="Consultation requests" actions={<div className="flex gap-1">{["", "new", "contacted", "resolved"].map((s) => <Button key={s} asChild size="sm" variant={(status ?? "") === s ? "secondary" : "ghost"}><Link href={s ? `/consultations?status=${s}` : "/consultations"}>{s || "All"}</Link></Button>)}</div>} />
      {rows.length === 0 ? <EmptyState icon={<MessageSquare />} title="No consultation requests" /> : (
        <div className="surface overflow-hidden"><Table>
          <THead><TR><TH>Patient</TH><TH>Pharmacy</TH><TH>Topic</TH><TH>Status</TH><TH>Received</TH><TH></TH></TR></THead>
          <TBody>{rows.map((r) => <TR key={r.id}><TD><div>{r.patient_name}</div><div className="text-xs text-ink-500">{r.patient_phone}</div></TD><TD>{r.pharmacies?.name ?? "—"}</TD><TD>{r.issues?.name ?? "—"}</TD><TD><StatusBadge status={r.status} /></TD><TD className="text-ink-500">{timeAgo(r.created_at)}</TD><TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/consultations/${r.id}`}>Open</Link></Button></TD></TR>)}</TBody>
        </Table></div>
      )}
    </div>
  );
}
