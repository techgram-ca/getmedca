import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@getmed/db/service";
import { formatCurrency } from "@getmed/core/format";
import { Avatar } from "@getmed/ui";
import { OrderingFrom } from "@/components/pharmacy/ordering-from";
import { ConsultationForm } from "@/components/consultation-form";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const metadata: Metadata = { title: "Request a consultation" };
export const dynamic = "force-dynamic";

type Search = { pharmacyId?: string; pharmacist?: string; issue?: string; service?: string };

export default async function RequestPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  if (!sp.pharmacyId) notFound();
  const pharmacy = await getPublicPharmacy(sp.pharmacyId);
  if (!pharmacy) notFound();
  const db = createServiceClient();
  const { data: config } = await db.from("form_field_config").select("*").eq("applies_to", "consultation");
  const service = sp.service ? pharmacy.services.find((s) => s.id === sp.service) ?? null : null;
  const issue = sp.issue ? pharmacy.issues.find((i) => i.slug === sp.issue) ?? null : null;

  // The pharmacist picked from the listing. Checked against this pharmacy's own
  // roster, so a stray id in the URL can't attach someone else's staff.
  const pharmacist = sp.pharmacist ? pharmacy.pharmacists.find((s) => s.id === sp.pharmacist) ?? null : null;

  // What this pharmacy charges for the topic. Shown before the patient commits,
  // and re-read server-side on submit rather than trusted from the page.
  let price: number | null = null;
  if (issue) {
    const { data: row } = await db
      .from("pharmacy_issues")
      .select("price")
      .eq("pharmacy_id", pharmacy.id)
      .eq("issue_id", issue.id)
      .maybeSingle();
    price = row?.price == null ? null : Number(row.price);
  }

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
      {pharmacist ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4">
          <Avatar src={pharmacist.photoUrl} name={pharmacist.name} size={44} className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink-950">{pharmacist.name}</p>
            <p className="truncate text-sm text-ink-500">
              {[pharmacist.credentials, pharmacist.languages.length ? `Speaks ${pharmacist.languages.join(", ")}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {issue ? (
            <p className="shrink-0 text-right">
              <span className="block text-lg font-extrabold text-brand-600">{price != null ? formatCurrency(price) : "No fee"}</span>
              <span className="block text-xs text-ink-500">{issue.name}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <ConsultationForm
        pharmacyId={pharmacy.id}
        pharmacistId={pharmacist?.id ?? null}
        pharmacyName={pharmacy.name ?? "the pharmacy"}
        issues={pharmacy.issues}
        initialIssue={issue?.slug ?? ""}
        service={service ? { id: service.id, name: service.name } : null}
        config={config ?? []}
      />
    </div>
  );
}
