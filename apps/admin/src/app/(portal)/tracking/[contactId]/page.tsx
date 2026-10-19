import { notFound } from "next/navigation";
import { requireAdmin } from "@getmed/core/auth";
import { outreachStage, summariseVisits } from "@getmed/core/outreach";
import { ContactDetail } from "@/components/contact-detail";

export default async function ContactPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  const { db } = await requireAdmin();

  const { data: contact } = await db.from("outreach_contacts").select("*").eq("id", contactId).maybeSingle();
  if (!contact) notFound();

  const [{ data: visitRows }, { data: pharmacies }, { data: rules }] = await Promise.all([
    db
      .from("outreach_visits")
      .select("id, created_at, likely_bot, kind, path, user_agent")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false }),
    db.from("pharmacies").select("id, name, status, submitted_at, email").order("name"),
    db.from("outreach_link_rules").select("slug, label, appends_rest").order("sort_order").order("slug"),
  ]);

  const visits = visitRows ?? [];
  const summary = summariseVisits(visits.map((v) => ({ created_at: v.created_at, likely_bot: v.likely_bot, kind: v.kind, path: v.path })));
  const pharmacy = contact.pharmacy_id ? (pharmacies ?? []).find((p) => p.id === contact.pharmacy_id) : null;
  const { stage, confirmed } = outreachStage({
    sentAt: contact.sent_at,
    humanVisits: summary.human,
    pharmacy: pharmacy ? { status: pharmacy.status, submitted_at: pharmacy.submitted_at } : null,
    manualSignedUpAt: contact.manual_signed_up_at,
  });

  return (
    <ContactDetail
      contact={contact}
      stage={stage}
      confirmed={confirmed}
      linkedPharmacyName={pharmacy?.name ?? pharmacy?.email ?? null}
      summary={{
        human: summary.human,
        bot: summary.bot,
        days: summary.days,
        byDestination: summary.byDestination,
        firstHuman: summary.firstHuman?.toISOString() ?? null,
        lastHuman: summary.lastHuman?.toISOString() ?? null,
      }}
      visits={visits.map((v) => ({
        id: v.id,
        created_at: v.created_at,
        likely_bot: v.likely_bot,
        kind: v.kind,
        path: v.path,
        user_agent: v.user_agent,
      }))}
      pharmacies={(pharmacies ?? []).map((p) => ({ id: p.id, name: p.name ?? p.email ?? "Unnamed" }))}
      rules={(rules ?? []).map((r) => ({ slug: r.slug, label: r.label, appends_rest: r.appends_rest }))}
      pharmacyUrl={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
    />
  );
}
