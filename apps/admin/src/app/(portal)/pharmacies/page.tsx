import Link from "next/link";
import { Building2, EyeOff } from "lucide-react";
import { requireAdmin } from "@getmed/core/auth";
import { formatDate } from "@getmed/core/format";
import type { PharmacyStatus } from "@getmed/db/types";
import { Badge, Button, EmptyState, PageHeader, TBody, TD, TH, THead, TR, Table } from "@getmed/ui";

const TONE: Record<string, "success" | "warning" | "neutral"> = { approved: "success", pending: "warning", inactive: "neutral" };

export default async function PharmaciesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { db } = await requireAdmin();
  let q = db.from("pharmacies").select("id, name, city, status, listed, submitted_at, approved_at, created_at, email").not("submitted_at", "is", null).order("submitted_at", { ascending: false });
  if (status) q = q.eq("status", status as PharmacyStatus);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Pharmacies" actions={<div className="flex gap-1">{["", "pending", "approved", "inactive"].map((s) => <Button key={s} asChild size="sm" variant={(status ?? "") === s ? "secondary" : "ghost"}><Link href={s ? `/pharmacies?status=${s}` : "/pharmacies"}>{s || "All"}</Link></Button>)}</div>} />
      {(data ?? []).length === 0 ? <EmptyState icon={<Building2 />} title="No pharmacies" /> : (
        <div className="surface overflow-hidden">
          <Table>
            <THead><TR><TH>Pharmacy</TH><TH>City</TH><TH>Status</TH><TH>Submitted</TH><TH></TH></TR></THead>
            <TBody>{(data ?? []).map((p) => (
              <TR key={p.id}><TD><div className="font-medium">{p.name ?? "Unnamed"}</div><div className="text-xs text-ink-500">{p.email}</div></TD><TD>{p.city ?? "—"}</TD><TD><span className="flex flex-wrap items-center gap-1.5"><Badge tone={TONE[p.status]} className="capitalize">{p.status}</Badge>{p.status === "approved" && !p.listed ? <Badge tone="neutral"><EyeOff className="size-3" /> Hidden</Badge> : null}</span></TD><TD className="text-ink-500">{formatDate(p.submitted_at)}</TD><TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/pharmacies/${p.id}`}>Review</Link></Button></TD></TR>
            ))}</TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
