import { redirect } from "next/navigation";
import { requirePharmacy } from "@getmed/core/auth";
import { Alert } from "@getmed/ui";
import { DashboardShell } from "@/components/dashboard-shell";
import { RealtimeOrders } from "@/components/realtime-orders";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof requirePharmacy>>;
  try {
    ctx = await requirePharmacy();
  } catch {
    redirect("/login");
  }
  const { pharmacy, db } = ctx;
  if (!pharmacy.submitted_at) redirect("/signup");
  const { data: full } = await db.from("pharmacies").select("notify_sound, inactive_reason").eq("id", pharmacy.id).maybeSingle();

  return (
    <DashboardShell pharmacyName={pharmacy.name ?? "Your pharmacy"} status={pharmacy.status}>
      <RealtimeOrders pharmacyId={pharmacy.id} sound={full?.notify_sound ?? true} />
      {pharmacy.status === "pending" ? (
        <Alert tone="info" title="Your profile is under review" className="mb-6">
          Our team is verifying your licence. You'll be visible to patients as soon as you're approved — usually within one business day.
        </Alert>
      ) : null}
      {pharmacy.status === "inactive" ? (
        <Alert tone="warning" title="Your pharmacy is currently inactive" className="mb-6">
          {full?.inactive_reason ?? "You are not visible in patient search."} Contact GetMed support to reactivate.
        </Alert>
      ) : null}
      {children}
    </DashboardShell>
  );
}
