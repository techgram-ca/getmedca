"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, FileText, Mail, Plus, Save, Star, Trash2 } from "lucide-react";
import { DEFAULT_TEMPLATE, outreachPlaceholders, type LinkRule } from "@getmed/core/outreach";
import { Badge, Button, Field, Input, Select, Textarea, toast } from "@getmed/ui";
import { deleteEmailTemplate, saveEmailTemplate } from "@/lib/actions/outreach";

export type Template = { id: string; name: string; subject: string; body: string; is_default: boolean };

/**
 * The prose for the pitch emails, written once.
 *
 * The emails still go out by hand from a real mailbox — this is not a sender,
 * and nothing here has a Send button. It holds the HTML so the per-pharmacy
 * parts can be substituted on the contact's own row instead of being retyped,
 * which is where a token ends up in the wrong pharmacy's email.
 *
 * Collapsed by default. It is edited once a month and the list under it is
 * read every day.
 */
export function EmailTemplateEditor({
  templates,
  rules,
  pharmacyUrl,
}: {
  templates: Template[];
  rules: LinkRule[];
  pharmacyUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? "");
  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const defaultName = templates.find((t) => t.is_default)?.name ?? null;

  const [draft, setDraft] = useState<Template | null>(null);
  const editing = draft ?? selected;

  // Every placeholder, shown against a made-up contact so the examples are
  // concrete without being one real pharmacy's actual link.
  const placeholders = outreachPlaceholders(
    { pharmacy_name: "Bolton Rx", city: "Bolton", token: "exampleToken" },
    rules,
    pharmacyUrl,
  );

  const pick = (id: string) => {
    setSelectedId(id);
    setDraft(null);
  };

  const edit = (patch: Partial<Template>) => {
    if (!editing) return;
    setDraft({ ...editing, ...patch });
  };

  const save = () =>
    start(async () => {
      if (!editing) return;
      const r = await saveEmailTemplate({
        id: editing.id || undefined,
        name: editing.name,
        subject: editing.subject,
        body: editing.body,
        isDefault: editing.is_default,
      });
      if (r.ok) {
        toast.success("Template saved");
        setDraft(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const addNew = (sample: boolean) => {
    setSelectedId("");
    setDraft({
      id: "",
      name: sample ? "First pitch" : "",
      // The sample lives in TypeScript rather than being seeded by the
      // migration: it is the thing the placeholder tests are written against,
      // and a copy of it in SQL would be the one that drifts.
      subject: sample ? DEFAULT_TEMPLATE.subject : "",
      body: sample ? DEFAULT_TEMPLATE.body : "",
      is_default: templates.length === 0,
    });
  };

  const remove = (id: string) =>
    start(async () => {
      const r = await deleteEmailTemplate(id);
      if (r.ok) {
        toast.success("Template deleted");
        setDraft(null);
        setSelectedId(templates.find((t) => t.id !== id)?.id ?? "");
        router.refresh();
      } else toast.error(r.error);
    });

  const dirty = draft !== null && (selected === null || JSON.stringify(draft) !== JSON.stringify(selected));

  return (
    // Same shape as Link destinations below it, rather than a Card: a
    // CardHeader has no bottom padding, because it expects a CardContent under
    // it to supply one. Collapsed there is no content, and the title sits hard
    // against the bottom edge.
    <div className="surface mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-soft hover:bg-ink-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Mail className="size-4 shrink-0 text-brand-600" />
          <span className="text-sm font-semibold text-ink-900">Email template</span>
          <span className="truncate text-xs text-ink-500">
            {templates.length === 0
              ? "none yet — the pitch HTML, written once"
              : `${templates.length} saved${defaultName ? ` — ${defaultName} by default` : ""}`}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-ink-200 p-5">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Template" htmlFor="tpl-pick" className="min-w-56 flex-1">
              <Select id="tpl-pick" value={selectedId} onChange={(e) => pick(e.target.value)} disabled={pending}>
                {templates.length === 0 ? <option value="">No templates yet</option> : null}
                {draft && !draft.id ? <option value="">New template…</option> : null}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Button size="sm" variant="outline" onClick={() => addNew(false)} disabled={pending}><Plus /> New</Button>
            {selected?.id ? (
              <Button size="sm" variant="ghost" className="text-danger-500" disabled={pending} onClick={() => remove(selected.id)}>
                <Trash2 /> Delete
              </Button>
            ) : null}
          </div>

          {editing ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="tpl-name" required hint="What it is for — first pitch, follow-up.">
                  <Input id="tpl-name" value={editing.name} onChange={(e) => edit({ name: e.target.value })} required />
                </Field>
                <Field label="Subject line" htmlFor="tpl-subject" hint="Placeholders work here too.">
                  <Input id="tpl-subject" value={editing.subject} onChange={(e) => edit({ subject: e.target.value })} />
                </Field>
              </div>

              <Field label="Body (HTML)" htmlFor="tpl-body" hint="Inline styles only — a mail client ignores a stylesheet.">
                <Textarea
                  id="tpl-body"
                  rows={14}
                  className="font-mono text-xs"
                  value={editing.body}
                  onChange={(e) => edit({ body: e.target.value })}
                />
              </Field>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Placeholders — click to copy
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map((ph) => (
                    <button
                      key={ph.key}
                      type="button"
                      title={`${ph.label} — e.g. ${ph.example}`}
                      className="cursor-pointer rounded-full border border-ink-200 bg-white px-2.5 py-1 font-mono text-xs text-ink-700 transition-soft hover:border-brand-600 hover:text-brand-700"
                      onClick={() => { void navigator.clipboard.writeText(ph.key); toast.success(`${ph.key} copied`); }}
                    >
                      {ph.key}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  One per link destination, named after its slug — add a destination below and it appears here. Links
                  resolve to the whole URL, so no template ever names the site.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_default}
                  onChange={(e) => edit({ is_default: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 text-brand-600" /> Use this one by default
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" loading={pending} loadingText="Saving…" disabled={!dirty && !!selected}>
                  <Save /> Save template
                </Button>
                {dirty ? <Badge tone="warning">Unsaved changes</Badge> : null}
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">
                No template yet. Start from the sample and edit it, or write your own — either way the placeholders
                below do the per-pharmacy parts.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => addNew(true)}><FileText /> Start from the sample</Button>
                <Button size="sm" variant="outline" onClick={() => addNew(false)}><Plus /> Write my own</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {placeholders.map((ph) => (
                  <code key={ph.key} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 font-mono text-xs text-ink-600">
                    {ph.key}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
