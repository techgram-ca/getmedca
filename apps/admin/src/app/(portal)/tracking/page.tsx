import { requireAdmin } from "@getmed/core/auth";
import { outreachStage, summariseVisits, type Visit } from "@getmed/core/outreach";
import { PageHeader } from "@getmed/ui";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { LinkRulesEditor } from "@/components/link-rules-editor";
import { TrackingTable } from "@/components/tracking-table";

export default async function TrackingPage() {
  const { db } = await requireAdmin();
  const [{ data: contacts }, { data: visits }, { data: pharmacies }, { data: rules }, { data: templates }, { data: files }] =
    await Promise.all([
      db.from("outreach_contacts").select("*").order("created_at", { ascending: false }),
      db.from("outreach_visits").select("contact_id, created_at, likely_bot, kind, path").order("created_at"),
      db.from("pharmacies").select("id, name, status, submitted_at, email").order("name"),
      db.from("outreach_link_rules").select("*").order("sort_order").order("slug"),
      db.from("outreach_email_templates").select("*").order("is_default", { ascending: false }).order("name"),
      db.from("outreach_template_files").select("*").order("created_at"),
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
    const stage = outreachStage({
      sentAt: c.sent_at,
      humanVisits: summary.human,
      pharmacy: pharmacy ? { status: pharmacy.status, submitted_at: pharmacy.submitted_at } : null,
    });
    return {
      id: c.id,
      token: c.token,
      pharmacy_name: c.pharmacy_name,
      contact_email: c.contact_email,
      city: c.city,
      unsubscribed_at: c.unsubscribed_at,
      sent_at: c.sent_at,
      created_at: c.created_at,
      stage,
      visits: { human: summary.human, days: summary.days },
    };
  });

  const pharmacyUrl = process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca";
  // Read here rather than in the browser: the UI says plainly that sending is
  // unconfigured instead of offering a button that throws. The mailbox wins
  // over Resend when both are set, which is what the send path does too.
  const viaSmtp = !!process.env.OUTREACH_SMTP_HOST?.trim() && !!process.env.OUTREACH_SMTP_USER?.trim() && !!process.env.OUTREACH_SMTP_PASSWORD;
  const via = viaSmtp ? ("smtp" as const) : process.env.RESEND_API_KEY ? ("resend" as const) : null;
  const sender = {
    ready: !!process.env.OUTREACH_FROM_EMAIL?.trim() && via !== null,
    from: process.env.OUTREACH_FROM_EMAIL?.trim() ?? null,
    replyTo: process.env.OUTREACH_REPLY_TO_EMAIL?.trim() ?? null,
    via,
    smtpHost: viaSmtp ? (process.env.OUTREACH_SMTP_HOST?.trim() ?? null) : null,
  };

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Tracking"
        description="Pharmacies pitched by email, and what came of it. Write the pitch once as a template, send it to one or many, and watch what happens after the link is clicked."
      />
      <EmailTemplateEditor
        templates={templates ?? []}
        files={files ?? []}
        rules={rules ?? []}
        pharmacyUrl={pharmacyUrl}
      />
      <LinkRulesEditor
        rules={rules ?? []}
        pharmacyUrl={pharmacyUrl}
        patientUrl={process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"}
      />
      <TrackingTable
        rows={rows}
        templates={templates ?? []}
        rules={rules ?? []}
        pharmacyUrl={pharmacyUrl}
        sender={sender}
      />
    </div>
  );
}
