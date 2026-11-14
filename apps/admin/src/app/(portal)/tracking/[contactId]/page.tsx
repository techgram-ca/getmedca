import { notFound } from "next/navigation";
import { requireAdmin } from "@getmed/core/auth";
import { outreachStage, summariseVisits } from "@getmed/core/outreach";
import { ContactDetail } from "@/components/contact-detail";

export default async function ContactPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  const { db } = await requireAdmin();

  const { data: contact } = await db.from("outreach_contacts").select("*").eq("id", contactId).maybeSingle();
  if (!contact) notFound();

  const [{ data: visitRows }, { data: counts }, { data: pharmacies }, { data: rules }, { data: templates }, { data: sends }] = await Promise.all([
    db
      .from("outreach_visits")
      .select("id, created_at, likely_bot, kind, path, user_agent")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      // Newest first and explicitly bounded. The log below shows 50 and the
      // destination breakdown needs each row's path, so this is the only
      // part that still reads hits individually — one contact's worth, with
      // a stated ceiling rather than whichever one PostgREST happens to
      // impose. The totals come from the view, so they stay exact past it.
      .limit(500),
    db.from("outreach_visit_counts").select("*").eq("contact_id", contact.id).maybeSingle(),
    db.from("pharmacies").select("id, name, status, submitted_at, email").order("name"),
    db.from("outreach_link_rules").select("*").order("sort_order").order("slug"),
    db.from("outreach_email_templates").select("*").order("is_default", { ascending: false }).order("name"),
    db.from("outreach_sends").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
  ]);

  const visits = visitRows ?? [];
  // Only the destination breakdown is derived from the rows; every total
  // beside it is counted in the database and agrees with this function.
  const summary = summariseVisits(visits.map((v) => ({ created_at: v.created_at, likely_bot: v.likely_bot, kind: v.kind, path: v.path })));
  const human = counts?.human_visits ?? 0;
  const pharmacy = contact.pharmacy_id ? (pharmacies ?? []).find((p) => p.id === contact.pharmacy_id) : null;
  const stage = outreachStage({
    sentAt: contact.sent_at,
    humanVisits: human,
    pharmacy: pharmacy ? { status: pharmacy.status, submitted_at: pharmacy.submitted_at } : null,
  });

  return (
    <ContactDetail
      contact={contact}
      stage={stage}
      linkedPharmacyName={pharmacy?.name ?? pharmacy?.email ?? null}
      summary={{
        human,
        bot: counts?.bot_visits ?? 0,
        days: counts?.human_days ?? 0,
        byDestination: summary.byDestination,
        firstHuman: counts?.first_human ?? null,
        lastHuman: counts?.last_human ?? null,
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
      rules={(rules ?? []).map((r) => ({ slug: r.slug, site: r.site, path: r.path, appends_rest: r.appends_rest, label: r.label }))}
      templates={templates ?? []}
      sends={sends ?? []}
      senderReady={!!process.env.OUTREACH_FROM_EMAIL?.trim() && !!process.env.RESEND_API_KEY}
      pharmacyUrl={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}
    />
  );
}
