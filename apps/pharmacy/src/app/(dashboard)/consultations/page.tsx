import { requirePharmacy } from "@getmed/core/auth";
import { dayBounds, defaultDateWindow } from "@getmed/core/format";
import { PageHeader } from "@getmed/ui";
import type { ConsultationRow } from "@getmed/ui";
import { ConsultationsView } from "@/components/consultations-view";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const fallback = defaultDateWindow();
  const from = sp.from ?? fallback.from;
  const to = sp.to ?? fallback.to;
  const { startIso, endIso } = dayBounds(from, to);

  const { pharmacy, db } = await requirePharmacy();
  const { data } = await db
    .from("consultation_requests")
    .select("id, patient_name, patient_phone, status, created_at, callback_window, issues(name), pharmacy_services(name)")
    .eq("pharmacy_id", pharmacy.id)
    .not("phone_verified_at", "is", null)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1000);

  type Joined = NonNullable<typeof data>[number] & { issues: { name: string } | null; pharmacy_services: { name: string } | null };
  const rows: ConsultationRow[] = ((data ?? []) as Joined[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    status: r.status,
    patient_name: r.patient_name,
    patient_phone: r.patient_phone,
    topic: r.issues?.name ?? r.pharmacy_services?.name ?? null,
    callbackWindow: r.callback_window,
  }));

  return (
    <div>
      <PageHeader title="Consultation requests" description="Patients expecting a call from a pharmacist." />
      <ConsultationsView rows={rows} from={from} to={to} />
    </div>
  );
}
