import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requirePharmacy } from "@getmed/core/auth";
import { formatDate } from "@getmed/core/format";
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatusBadge } from "@getmed/ui";
import { ConsultationStatusForm } from "@/components/consultation-status-form";

export default async function ConsultationDetail({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const { pharmacy, db } = await requirePharmacy();
  const { data } = await db.from("consultation_requests").select("*, issues(name, description), pharmacy_services(name, price)").eq("id", requestId).eq("pharmacy_id", pharmacy.id).maybeSingle();
  if (!data) notFound();
  const r = data as typeof data & { issues: { name: string; description: string | null } | null; pharmacy_services: { name: string; price: number | null } | null };

  return (
    <div className="max-w-3xl">
      <PageHeader title={<span className="flex items-center gap-3">{r.patient_name} <StatusBadge status={r.status} /></span>} description={`Requested ${formatDate(r.created_at)}`} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Request</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-ink-500">Topic:</span> {r.issues?.name ?? r.pharmacy_services?.name ?? "—"}</p>
            <p><span className="text-ink-500">Preferred callback:</span> <span className="capitalize">{r.callback_window ?? "any time"}</span></p>
            <p><span className="text-ink-500">Patient's note:</span> {r.description ?? "—"}</p>
            <Button asChild size="lg" className="mt-2 w-full"><a href={`tel:${r.patient_phone}`}><Phone /> Call {r.patient_phone}</a></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
          <CardContent><ConsultationStatusForm id={r.id} status={r.status} note={r.pharmacy_note} /></CardContent>
        </Card>
      </div>
      <Button asChild variant="link" className="mt-6"><Link href="/consultations">← Back</Link></Button>
    </div>
  );
}
