"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCopy, Code2, Eye } from "lucide-react";
import { dropUnresolvedLinks, renderOutreachEmail, type LinkRule, type TemplateContact } from "@getmed/core/outreach";
import { Alert, Badge, Button, Dialog, DialogContent, Field, Select, toast } from "@getmed/ui";
import type { Template } from "./email-template-editor";

/**
 * One contact's finished email, ready to paste.
 *
 * Two copy buttons because mail clients want two different things. Gmail and
 * Outlook paste rich text, so the HTML has to reach the clipboard as
 * `text/html` or the tags show up as literal text in the message. Anything
 * composing raw HTML wants the source instead. Offering only one of them
 * means one of those two cases silently produces a broken email.
 */
export function EmailBuilderDialog({
  contact,
  templates,
  rules,
  pharmacyUrl,
  open,
  onOpenChange,
}: {
  contact: TemplateContact & { contact_email?: string | null };
  templates: Template[];
  rules: LinkRule[];
  pharmacyUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [templateId, setTemplateId] = useState(templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? "");
  const [view, setView] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? null;
  const rendered = useMemo(() => {
    if (!template) return null;
    const r = renderOutreachEmail(template, contact, rules, pharmacyUrl);
    // What is previewed and copied is what Send would produce, byte for byte.
    // A link that could not be built for this pharmacy is taken out of the
    // body either way, so the two paths cannot disagree.
    const html = dropUnresolvedLinks(r.html, r.unknown);
    const dropped = r.unknown.filter((k) => /-link\]$/i.test(k));
    const broken = r.unknown.filter((k) => !/-link\]$/i.test(k));
    return { ...r, html, dropped, broken };
  }, [template, contact, rules, pharmacyUrl]);

  const flash = (key: string, message: string) => {
    setCopied(key);
    toast.success(message);
    setTimeout(() => setCopied(null), 1600);
  };

  /** Rich: what Gmail and Outlook want. Falls back to source where the browser has no ClipboardItem. */
  const copyRich = async () => {
    if (!rendered) return;
    try {
      if (typeof ClipboardItem === "undefined") throw new Error("no ClipboardItem");
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([rendered.html], { type: "text/html" }),
          "text/plain": new Blob([stripTags(rendered.html)], { type: "text/plain" }),
        }),
      ]);
      flash("rich", "Copied — paste into your email");
    } catch {
      await navigator.clipboard.writeText(rendered.html);
      flash("rich", "Copied as HTML source — this browser cannot copy rich text");
    }
  };

  const copySource = async () => {
    if (!rendered) return;
    await navigator.clipboard.writeText(rendered.html);
    flash("source", "HTML source copied");
  };

  const copySubject = async () => {
    if (!rendered) return;
    await navigator.clipboard.writeText(rendered.subject);
    flash("subject", "Subject copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Email for ${contact.pharmacy_name}`} className="max-w-3xl">
        {templates.length === 0 ? (
          <Alert tone="info">
            No email template yet. Write one under <strong>Email template</strong> at the top of the Tracking page, then
            come back.
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Template" htmlFor="eb-template" className="min-w-48 flex-1">
                <Select id="eb-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
                  ))}
                </Select>
              </Field>
              <div className="flex gap-1">
                <Button size="sm" variant={view === "preview" ? "secondary" : "ghost"} onClick={() => setView("preview")}>
                  <Eye /> Preview
                </Button>
                <Button size="sm" variant={view === "source" ? "secondary" : "ghost"} onClick={() => setView("source")}>
                  <Code2 /> HTML
                </Button>
              </div>
            </div>

            {/* A placeholder that could not be filled would otherwise go out
                as literal brackets in an email to a real pharmacy. */}
            {rendered && rendered.dropped.length > 0 ? (
              <Alert tone="info" title="A link was left out">
                <p>
                  {rendered.dropped.map((u) => <code key={u} className="mr-1.5 font-mono">{u}</code>)}
                  could not be built for this pharmacy, so the wording stays and the link goes. Add a city to the
                  contact if it is the rate-card one.
                </p>
              </Alert>
            ) : null}

            {/* A misspelt field is a different thing: it is wrong for everyone
                on the list, not just this one, and it stops a send. */}
            {rendered && rendered.broken.length > 0 ? (
              <Alert tone="warning" title="Check the template">
                <p>
                  {rendered.broken.map((u) => <code key={u} className="mr-1.5 font-mono">{u}</code>)}
                  is not a placeholder — it would go out as written, and sending is blocked until it is fixed.
                </p>
              </Alert>
            ) : null}

            <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Subject</p>
                  <p className="truncate text-sm font-medium text-ink-900">{rendered?.subject || "—"}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copySubject}>
                  {copied === "subject" ? <Check /> : <ClipboardCopy />}
                </Button>
              </div>
              {contact.contact_email ? (
                <p className="mt-1.5 text-xs text-ink-500">To: {contact.contact_email}</p>
              ) : (
                <p className="mt-1.5 text-xs text-ink-500">No address on file for this contact.</p>
              )}
            </div>

            {view === "preview" ? (
              // srcDoc, not dangerouslySetInnerHTML: the template is admin-written,
              // but a <style> in it would otherwise reach the admin app's own
              // styles, and this is meant to show what a mail client renders.
              <iframe
                title="Email preview"
                className="h-[26rem] w-full rounded-lg border border-ink-200 bg-white"
                sandbox=""
                srcDoc={rendered?.html ?? ""}
              />
            ) : (
              <textarea
                readOnly
                className="h-[26rem] w-full resize-none rounded-lg border border-ink-200 bg-ink-50 p-3 font-mono text-xs text-ink-700"
                value={rendered?.html ?? ""}
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={copyRich}>
                {copied === "rich" ? <Check /> : <ClipboardCopy />} Copy for email
              </Button>
              <Button variant="outline" onClick={copySource}>
                {copied === "source" ? <Check /> : <Code2 />} Copy HTML source
              </Button>
              {rendered && rendered.used.length > 0 ? (
                <Badge tone="neutral">{rendered.used.length} placeholder{rendered.used.length === 1 ? "" : "s"} filled</Badge>
              ) : null}
            </div>
            <p className="text-xs text-ink-500">
              <strong>Copy for email</strong> pastes into Gmail or Outlook with the formatting and links intact.
              <strong className="ml-1">Copy HTML source</strong> is for anywhere that wants the markup itself. Mark the
              contact as sent once it has actually gone, so the bot filter has something to measure against.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A readable plain-text flavour for clients that take one. Not a renderer. */
function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
