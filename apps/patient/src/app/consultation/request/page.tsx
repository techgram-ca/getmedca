import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { Avatar } from "@getmed/ui";
import { ConsultationForm } from "@/components/consultation-form";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const metadata: Metadata = { title: "Request a consultation" };
export const dynamic = "force-dynamic";

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ pharmacyId?: string; issue?: string; service?: string }> }) {
  const sp = await searchParams;
  if (!sp.pharmacyId) notFound();
  const pharmacy = await getPublicPharmacy(sp.pharmacyId);
  if (!pharmacy) notFound();
  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*").eq("applies_to", "consultation");
  const service = sp.service ? pharmacy.services.find((s) => s.id === sp.service) ?? null : null;
  const issue = sp.issue ? pharmacy.issues.find((i) => i.slug === sp.issue) ?? null : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Avatar src={pharmacy.logoUrl} name={pharmacy.name ?? "Pharmacy"} size={52} className="rounded-xl" />
        <div>
          <p className="text-sm text-ink-500">Consultation with</p>
          <h1 className="text-xl font-semibold">{pharmacy.name}</h1>
        </div>
      </div>
      <ConsultationForm
        pharmacyId={pharmacy.id}
        pharmacyName={pharmacy.name ?? "the pharmacy"}
        issues={pharmacy.issues}
        initialIssue={issue?.slug ?? ""}
        service={service ? { id: service.id, name: service.name } : null}
        config={config ?? []}
      />
    </div>
  );
}
