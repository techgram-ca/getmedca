import { requireAdmin } from "@getmed/core/auth";
import { outreachStage } from "@getmed/core/outreach";
import { PageHeader } from "@getmed/ui";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { LinkRulesEditor } from "@/components/link-rules-editor";
import { TrackingTable } from "@/components/tracking-table";

export default async function TrackingPage() {
  const { db } = await requireAdmin();
  const [{ data: contacts }, { data: visits }, { data: pharmacies }, { data: rules }, { data: templates }, { data: files }] =
    await Promise.all([
      db.from("outreach_contacts").select("*").order("created_at", { ascending: false }),
      // Counted in the database, one row per contact. Fetching the hits
      // themselves and counting them here meant one row per hit across every
      // contact ever pitched, and PostgREST stops returning rows at its cap
      // without saying so — the contacts past it would have read as never
      // having opened the link, which also walks their stage back to "Sent".
      db.from("outreach_visit_counts").select("contact_id, human_visits, human_days"),
      db.from("pharmacies").select("id, name, status, submitted_at, email").order("name"),
      db.from("outreach_link_rules").select("*").order("sort_order").order("slug"),
      db.from("outreach_email_templates").select("*").order("is_default", { ascending: false }).order("name"),
      db.from("outreach_template_files").select("*").order("created_at"),
    ]);

  // A contact with only scanner hits is in the view with zero human visits;
  // one that was never clicked is not in it at all. Both read as none.
  const countsByContact = new Map((visits ?? []).map((v) => [v.contact_id, v]));
  const pharmacyById = new Map((pharmacies ?? []).map((p) => [p.id, p]));

  const rows = (contacts ?? []).map((c) => {
    const counts = countsByContact.get(c.id);
    const human = counts?.human_visits ?? 0;
    const pharmacy = c.pharmacy_id ? pharmacyById.get(c.pharmacy_id) : null;
    const stage = outreachStage({
      sentAt: c.sent_at,
      humanVisits: human,
      pharmacy: pharmacy ? { status: pharmacy.status, submitted_at: pharmacy.submitted_at } : null,
      emailFailedAt: c.email_failed_at,
    });
    return {
      id: c.id,
      token: c.token,
      pharmacy_name: c.pharmacy_name,
      contact_email: c.contact_email,
      city: c.city,
      unsubscribed_at: c.unsubscribed_at,
      sent_at: c.sent_at,
      email_failed_at: c.email_failed_at,
      email_failed_reason: c.email_failed_reason,
      created_at: c.created_at,
      stage,
      visits: { human, days: counts?.human_days ?? 0 },
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
