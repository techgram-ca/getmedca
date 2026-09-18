import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@getmed/core/auth";
import { formatDate } from "@getmed/core/format";
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatusBadge } from "@getmed/ui";
import { ResolveConsultation } from "@/components/resolve-consultation";

export default async function AdminConsultationDetail({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const { db } = await requireAdmin();
  const { data } = await db.from("consultation_requests").select("*, pharmacies(name, phone), issues(name), pharmacy_services(name)").eq("id", requestId).maybeSingle();
  if (!data) notFound();
  const r = data as typeof data & { pharmacies: { name: string | null; phone: string | null } | null; issues: { name: string } | null; pharmacy_services: { name: string } | null };
  return (
    <div className="max-w-3xl">
      <PageHeader title={<span className="flex items-center gap-3">{r.patient_name}<StatusBadge status={r.status} /></span>} description={`Requested ${formatDate(r.created_at)} · ${r.pharmacies?.name ?? "—"}`} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Request</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <p><span className="text-ink-500">Patient phone:</span> {r.patient_phone}</p>
          <p><span className="text-ink-500">Topic:</span> {r.issues?.name ?? r.pharmacy_services?.name ?? "—"}</p>
          <p><span className="text-ink-500">Callback window:</span> <span className="capitalize">{r.callback_window ?? "any"}</span></p>
          <p><span className="text-ink-500">Pharmacy phone:</span> {r.pharmacies?.phone ?? "—"}</p>
          <p><span className="text-ink-500">Pharmacy note:</span> {r.pharmacy_note ?? "—"}</p>
          <p><span className="text-ink-500">Contacted:</span> {formatDate(r.contacted_at)}</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Admin resolution</CardTitle></CardHeader><CardContent><ResolveConsultation id={r.id} status={r.status} note={r.admin_note} /></CardContent></Card>
      </div>
      <Button asChild variant="link" className="mt-6"><Link href="/consultations">← Back</Link></Button>
    </div>
  );
}
