import { requireAdmin } from "@getmed/core/auth";
import { EVENT_DEFINITIONS, TEMPLATE_DEFAULTS } from "@getmed/core/notifications";
import { PageHeader } from "@getmed/ui";
import { TemplateEditor, type TemplateRow } from "@/components/template-editor";

export default async function NotificationsPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("notification_templates").select("*");
  const rows: TemplateRow[] = [];
  for (const def of EVENT_DEFINITIONS) {
    for (const channel of ["sms", "email"] as const) {
      const fallback = TEMPLATE_DEFAULTS[def.event][channel];
      if (!fallback) continue;
      const saved = (data ?? []).find((t) => t.event_type === def.event && t.channel === channel);
      rows.push({
        event: def.event, label: def.label, recipient: def.recipient, channel, placeholders: [...def.placeholders], required: [...def.required],
        editable: saved?.template_editable ?? def.editable,
        subject: saved?.subject ?? fallback.subject, text: saved?.template_text ?? fallback.text, enabled: saved?.enabled ?? fallback.enabled,
        isDefault: (saved?.template_text ?? fallback.text) === fallback.text && (saved?.subject ?? fallback.subject) === fallback.subject,
      });
    }
  }
  return (
    <div className="max-w-4xl">
      <PageHeader title="Notification templates" description="Per event and channel. Placeholders in braces are substituted at send time; required ones can't be removed." />
      <TemplateEditor rows={rows} />
    </div>
  );
}
