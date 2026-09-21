import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { OrderingFrom } from "@/components/pharmacy/ordering-from";
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
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Request a pharmacist call</h1>
      <p className="mt-2 text-ink-500">
        Tell us how to reach you and a pharmacist will call you back, usually the same business day.
      </p>

      <OrderingFrom
        className="my-6"
        label="Consultation with"
        pharmacy={{
          id: pharmacy.id,
          slug: pharmacy.slug ?? pharmacy.id,
          name: pharmacy.name ?? "this pharmacy",
          logoUrl: pharmacy.logoUrl,
        }}
      />
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
