import { requireAdmin } from "@getmed/core/auth";
import { dayBounds, defaultDateWindow } from "@getmed/core/format";
import { PageHeader } from "@getmed/ui";
import { EscalationsTable, type EscalationRow } from "@/components/escalations-table";
import { adminOrders, escalationReason, withNames } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EscalationsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const fallback = defaultDateWindow();
  const from = sp.from ?? fallback.from;
  const to = sp.to ?? fallback.to;
  const { startIso, endIso } = dayBounds(from, to);

  const { db } = await requireAdmin();
  const { data } = await adminOrders(db)
    .not("escalated_at", "is", null)
    .gte("escalated_at", startIso)
    .lt("escalated_at", endIso)
    .order("escalated_at", { ascending: false })
    .limit(1000);
  const named = await withNames(db, data ?? []);

  const rows: EscalationRow[] = named.map((o) => {
    const reason = escalationReason(o);
    return {
      id: o.id,
      status: o.status,
      escalated_at: o.escalated_at!,
      escalation_status: o.escalation_status,
      patient_name: o.patient_name,
      patient_phone: o.patient_phone,
      pharmacyName: o.pharmacy?.name ?? null,
      reasonKind: reason.kind,
      reasonText: reason.text,
    };
  });

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Rejected, cancelled, timed-out and failed deliveries. You contact the patient — pharmacies and drivers never do."
      />
      <EscalationsTable rows={rows} from={from} to={to} />
    </div>
  );
}
