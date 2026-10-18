import { requireAdmin } from "@getmed/core/auth";
import { outreachStage, summariseVisits, type Visit } from "@getmed/core/outreach";
import { PageHeader } from "@getmed/ui";
import { LinkRulesEditor } from "@/components/link-rules-editor";
import { TrackingTable } from "@/components/tracking-table";

export default async function TrackingPage() {
  const { db } = await requireAdmin();
  const [{ data: contacts }, { data: visits }, { data: pharmacies }, { data: rules }] = await Promise.all([
    db.from("outreach_contacts").select("*").order("created_at", { ascending: false }),
    db.from("outreach_visits").select("contact_id, created_at, likely_bot, kind, path").order("created_at"),
    db.from("pharmacies").select("id, name, status, submitted_at, email").order("name"),
    db.from("outreach_link_rules").select("*").order("sort_order").order("slug"),
  ]);

  const byContact = new Map<string, Visit[]>();
  for (const v of visits ?? []) {
    const list = byContact.get(v.contact_id) ?? [];
    list.push({ created_at: v.created_at, likely_bot: v.likely_bot, kind: v.kind, path: v.path });
    byContact.set(v.contact_id, list);
  }
  const pharmacyById = new Map((pharmacies ?? []).map((p) => [p.id, p]));

  const rows = (contacts ?? []).map((c) => {
    const summary = summariseVisits(byContact.get(c.id) ?? []);
    const pharmacy = c.pharmacy_id ? pharmacyById.get(c.pharmacy_id) : null;
    const { stage, confirmed } = outreachStage({
      sentAt: c.sent_at,
      humanVisits: summary.human,
      pharmacy: pharmacy ? { status: pharmacy.status, submitted_at: pharmacy.submitted_at } : null,
      manualSignedUpAt: c.manual_signed_up_at,
    });
    return {
      ...c,
      stage,
      confirmed,
      pharmacyName: pharmacy?.name ?? null,
      visits: {
        human: summary.human,
        bot: summary.bot,
        days: summary.days,
        byDestination: summary.byDestination,
        lastHuman: summary.lastHuman ? summary.lastHuman.toISOString() : null,
      },
    };
  });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Tracking"
        description="Pharmacies pitched by email, and what came of it. Nothing here sends anything — you write the emails, this records what happens after the link is clicked."
      />
      <LinkRulesEditor
        rules={rules ?? []}
        pharmacyUrl={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
        patientUrl={process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"}
      />
      <TrackingTable
        rules={(rules ?? []).map((r) => ({ slug: r.slug, label: r.label, appends_rest: r.appends_rest }))}
        rows={rows}
        pharmacies={(pharmacies ?? []).map((p) => ({ id: p.id, name: p.name ?? p.email ?? "Unnamed", status: p.status }))}
        pharmacyUrl={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
      />
    </div>
  );
}
