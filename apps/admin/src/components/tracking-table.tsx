"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, Code2, Copy, Mail, Plus, RotateCcw, Send } from "lucide-react";
import {
  OUTREACH_STAGES, joinUrl, renderOutreachEmail, STAGE_LABELS,
  type LinkRule, type OutreachStage,
} from "@getmed/core/outreach";
import {
  Alert, Badge, Button, Dialog, DialogContent, Field, FilterSelect, Input, Select,
  TBody, TD, TH, THead, TR, Table, Textarea, toast,
} from "@getmed/ui";
import { saveContact } from "@/lib/actions/outreach";
import { sendOutreachEmails, type SendOutcome } from "@/lib/actions/outreach-send";
import { EmailBuilderDialog } from "./email-builder-dialog";
import type { Template } from "./email-template-editor";

type Row = {
  id: string; token: string; pharmacy_name: string; contact_email: string | null; city: string | null;
  unsubscribed_at: string | null; stage: OutreachStage;
  sent_at: string | null; created_at: string;
  visits: { human: number; days: number };
};
type Draft = { pharmacyName: string; contactEmail: string; city: string; notes: string };
export type SenderConfig = {
  ready: boolean;
  from: string | null;
  replyTo: string | null;
  /** Which way mail leaves. Named in the confirmation, so a placement
   *  question later has an answer rather than a guess. */
  via: "smtp" | "resend" | null;
  smtpHost: string | null;
};

const EMPTY: Draft = { pharmacyName: "", contactEmail: "", city: "", notes: "" };

export const STAGE_TONE: Record<OutreachStage, "neutral" | "brand" | "success" | "warning"> = {
  new: "neutral", sent: "neutral", visited: "warning", signed_up: "brand", submitted: "brand", approved: "success",
};

type Filters = {
  q: string;
  city: string;
  stage: string;
  /** One calendar day, local, matched against the send date. */
  sentOn: string;
};

const NO_FILTERS: Filters = { q: "", city: "", stage: "", sentOn: "" };

/**
 * The local calendar day a timestamp falls on.
 *
 * `sent_at` is stored UTC and the date input speaks the admin's local
 * calendar. Slicing the ISO string compares the two directly, so an email
 * marked sent at 9pm in Toronto is filed under the following day and a filter
 * for the day it was actually sent finds nothing.
 */
function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The list is five columns on purpose.
 *
 * Everything else — the notes, the link variants, the things that change a row
 * — lives on the contact's own page. A table wide enough to hold all of it
 * could not be read at a glance, and reading it at a glance is the only thing
 * a list is for.
 *
 * Filtering happens here rather than in the query. Stage is derived from the
 * visit rows, not stored, so SQL cannot filter on it; and the whole list is a
 * few dozen pharmacies, so narrowing it in the browser is instant and survives
 * the refresh that follows an edit.
 */
export function TrackingTable({
  rows, templates, rules, pharmacyUrl, sender,
}: {
  rows: Row[];
  templates: Template[];
  rules: LinkRule[];
  pharmacyUrl: string;
  sender: SenderConfig;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<Row | null>(null);
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // The send confirmation, and afterwards the per-pharmacy report.
  const [sendPlan, setSendPlan] = useState<Row[] | null>(null);
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [report, setReport] = useState<SendOutcome[] | null>(null);

  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const shown = useMemo(() => rows.filter((r) => matches(r, f)), [rows, f]);
  const active = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

  // Which template Source uses without asking. The dialog is for choosing a
  // different one; this button is for the common case, which is the default.
  const fallbackTemplate = templates.find((t) => t.is_default) ?? templates[0] ?? null;

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const sendable = (c: Row) => !c.unsubscribed_at && !!c.contact_email?.trim();
  const pickedRows = shown.filter((c) => picked.has(c.id));
  const pickedSendable = pickedRows.filter(sendable);
  const allShownPicked = shown.length > 0 && shown.every((c) => picked.has(c.id));

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Only what is on screen: ticking the header while a filter is on should
  // not quietly select the pharmacies the filter is hiding.
  const toggleAll = () =>
    setPicked((s) => {
      const next = new Set(s);
      if (allShownPicked) for (const c of shown) next.delete(c.id);
      else for (const c of shown) next.add(c.id);
      return next;
    });

  const openSend = (targets: Row[]) => {
    if (!templates.length) {
      toast.error("No email template yet. Write one under Email template at the top of this page.");
      return;
    }
    setSendTemplateId(fallbackTemplate?.id ?? templates[0]!.id);
    setReport(null);
    setSendPlan(targets);
  };

  const confirmSend = () =>
    start(async () => {
      if (!sendPlan) return;
      const r = await sendOutreachEmails(sendPlan.map((c) => c.id), sendTemplateId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const sent = r.outcomes.filter((o) => o.status === "sent").length;
      // The report stays on screen: a toast saying "9 sent, 3 skipped" is
      // useless without knowing which three, and why.
      setReport(r.outcomes);
      setPicked(new Set());
      if (sent) toast.success(`${sent} email${sent === 1 ? "" : "s"} sent`);
      else toast.error("Nothing was sent");
      router.refresh();
    });

  const copyLink = async (id: string, token: string) => {
    await navigator.clipboard.writeText(joinUrl(pharmacyUrl, `i/${token}`));
    flash(`${id}:link`);
    toast.success("Pitch link copied");
  };

  /**
   * The finished HTML for this pharmacy, in one click.
   *
   * The dialog can do this too, but reaching it is open, read, copy, close for
   * something done once per pharmacy down a list of thirty. A placeholder that
   * did not resolve still copies — refusing would be worse than letting it
   * through — but says so, because this path has no preview to notice it in.
   */
  const copySource = async (c: Row) => {
    if (!fallbackTemplate) {
      toast.error("No email template yet. Write one under Email template at the top of this page.");
      return;
    }
    const r = renderOutreachEmail(fallbackTemplate, c, rules, pharmacyUrl);
    await navigator.clipboard.writeText(r.html);
    flash(`${c.id}:source`);
    if (r.unknown.length) {
      toast.error(`Copied, but ${r.unknown.join(" ")} did not resolve — fix it before sending.`);
    } else {
      toast.success(`HTML source copied — ${fallbackTemplate.name}`);
    }
  };

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await saveContact(draft);
      if (r.ok) {
        toast.success("Contact added");
        setDraft(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <div className="surface mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search name or email"
            aria-label="Search name or email"
            className="h-9 min-w-48 flex-1 text-sm"
          />

          <FilterSelect value={f.city} onChange={(v) => set("city", v)} label="City">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__none">No city set</option>
          </FilterSelect>

          <FilterSelect value={f.stage} onChange={(v) => set("stage", v)} label="Stage">
            <option value="">Any stage</option>
            {OUTREACH_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            <option value="__unsub">Unsubscribed</option>
          </FilterSelect>

          {/* One day, not a window. Picking a range to answer "who did I email
              on Tuesday" meant setting both ends to the same date. */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-ink-500">Sent on</span>
            <Input
              type="date" value={f.sentOn} aria-label="Sent on"
              className="h-9 w-[9.5rem] text-sm" onChange={(e) => set("sentOn", e.target.value)}
            />
          </div>

          <Button size="sm" variant="ghost" onClick={() => setF(NO_FILTERS)} disabled={!active}>
            <RotateCcw /> Reset
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDraft(EMPTY)}><Plus /> New contact</Button>
          <Button
            size="sm"
            disabled={!sender.ready || pickedSendable.length === 0}
            title={
              !sender.ready
                ? "Sending is not configured"
                : pickedSendable.length === 0
                  ? "Tick the pharmacies to send to"
                  : `Send to ${pickedSendable.length}`
            }
            onClick={() => openSend(pickedSendable)}
          >
            <Send /> Send to selected{pickedSendable.length ? ` (${pickedSendable.length})` : ""}
          </Button>
        </div>

        <p className="mt-2 text-xs text-ink-500">
          {shown.length === rows.length ? (
            <>{rows.length} contact{rows.length === 1 ? "" : "s"}</>
          ) : (
            <>Showing <span className="font-semibold text-ink-950">{shown.length}</span> of {rows.length}</>
          )}
          {f.sentOn ? " · contacts never sent are excluded by a sent-on date" : null}
          {picked.size ? <> · <span className="font-semibold text-ink-950">{picked.size}</span> selected</> : null}
          {picked.size > pickedSendable.length ? (
            <> ({picked.size - pickedSendable.length} cannot be sent to)</>
          ) : null}
        </p>

        {!sender.ready ? (
          <Alert tone="warning" className="mt-3">
            Sending is off. Set <code className="font-mono">OUTREACH_FROM_EMAIL</code>, plus either the{" "}
            <code className="font-mono">OUTREACH_SMTP_*</code> mailbox settings or{" "}
            <code className="font-mono">RESEND_API_KEY</code> — copying the HTML still works without them.
          </Alert>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-500">
          No contacts yet. Add a pharmacy, copy its link, and paste it into the email you write.
        </div>
      ) : shown.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-500">
          No contact matches these filters. <button className="cursor-pointer underline" onClick={() => setF(NO_FILTERS)}>Clear them</button>.
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all shown"
                    className="cursor-pointer"
                    checked={allShownPicked}
                    onChange={toggleAll}
                  />
                </TH>
                <TH>Pharmacy</TH><TH>Stage</TH><TH>Visits</TH><TH>Send &amp; copy</TH><TH />
              </TR>
            </THead>
            <TBody>
              {shown.map((c) => (
                <TR key={c.id} className={c.unsubscribed_at ? "opacity-55" : undefined}>
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.pharmacy_name}`}
                      className="cursor-pointer disabled:cursor-not-allowed"
                      checked={picked.has(c.id)}
                      disabled={!sendable(c)}
                      title={sendable(c) ? undefined : c.unsubscribed_at ? "Unsubscribed" : "No email address"}
                      onChange={() => toggle(c.id)}
                    />
                  </TD>
                  <TD>
                    <p className="font-medium">{c.pharmacy_name}</p>
                    {/* City and address on one line: between them they are how
                        you recognise a pharmacy you emailed three weeks ago. */}
                    <p className="text-xs text-ink-500">
                      {c.city ?? "No city"}
                      <span className="mx-1.5 text-ink-300">|</span>
                      {c.contact_email ?? "No email"}
                    </p>
                    {c.unsubscribed_at ? <Badge tone="danger" className="mt-1">Do not contact</Badge> : null}
                  </TD>

                  <TD>
                    <Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABELS[c.stage]}</Badge>
                  </TD>

                  <TD className="whitespace-nowrap text-sm">
                    {c.visits.human === 0 ? (
                      <span className="text-ink-400">none</span>
                    ) : (
                      <>
                        <span className="font-semibold text-ink-900">{c.visits.days}</span>
                        <span className="text-ink-500"> day{c.visits.days === 1 ? "" : "s"}</span>
                        <span className="text-ink-500"> · {c.visits.human} hit{c.visits.human === 1 ? "" : "s"}</span>
                      </>
                    )}
                  </TD>

                  <TD>
                    <div className="flex flex-nowrap gap-1.5">
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={!sender.ready || !sendable(c)}
                        title={
                          !sender.ready
                            ? "Sending is not configured"
                            : c.unsubscribed_at
                              ? "They asked not to be contacted"
                              : !c.contact_email
                                ? "No email address on file"
                                : `Send ${fallbackTemplate?.name ?? "the pitch"} to ${c.contact_email}`
                        }
                        onClick={() => openSend([c])}
                      >
                        <Send /> {c.sent_at ? "Resend" : "Send"}
                      </Button>
                      <Button size="sm" variant="outline" className="shrink-0" title="Copy the pitch link" onClick={() => copyLink(c.id, c.token)}>
                        {copied === `${c.id}:link` ? <Check /> : <Copy />} Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        title={fallbackTemplate ? `Copy the HTML body — ${fallbackTemplate.name}` : "No template yet"}
                        onClick={() => copySource(c)}
                      >
                        {copied === `${c.id}:source` ? <Check /> : <Code2 />} Source
                      </Button>
                      <Button size="sm" variant="outline" className="shrink-0" title="Preview, pick a template, copy for Gmail" onClick={() => setEmailFor(c)}>
                        <Mail /> Email
                      </Button>
                    </div>
                  </TD>

                  <TD className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/tracking/${c.id}`}>View details <ChevronRight /></Link>
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {/* Sending is the one thing on this page that cannot be undone, so it
          asks first and then says, per pharmacy, what happened. */}
      <Dialog open={sendPlan !== null} onOpenChange={(o) => !o && (setSendPlan(null), setReport(null))}>
        <DialogContent title={report ? "What was sent" : sendPlan?.length === 1 ? "Send this pitch" : `Send to ${sendPlan?.length ?? 0} pharmacies`} className="max-w-xl">
          {report ? (
            <div className="space-y-3">
              <ul className="max-h-80 list-none space-y-1.5 overflow-auto">
                {report.map((o) => (
                  <li key={o.contactId} className="flex items-start gap-2.5 text-sm">
                    <Badge tone={o.status === "sent" ? "success" : o.status === "skipped" ? "warning" : "danger"}>
                      {o.status}
                    </Badge>
                    <span className="min-w-0">
                      <span className="font-medium text-ink-950">{o.pharmacyName}</span>
                      {o.detail ? <span className="block text-xs text-ink-500">{o.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Button onClick={() => { setSendPlan(null); setReport(null); }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Template" htmlFor="send-tpl">
                <Select id="send-tpl" value={sendTemplateId} onChange={(e) => setSendTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
                  ))}
                </Select>
              </Field>

              <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Going to</p>
                <ul className="mt-1.5 max-h-44 list-none space-y-0.5 overflow-auto">
                  {(sendPlan ?? []).map((c) => (
                    <li key={c.id} className="truncate">
                      <span className="font-medium text-ink-950">{c.pharmacy_name}</span>
                      <span className="text-ink-500"> — {c.contact_email}</span>
                      {c.sent_at ? <Badge tone="warning" className="ml-2">already sent once</Badge> : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">
                  From {sender.from}
                  {sender.replyTo ? <> · replies go to {sender.replyTo}</> : <> · no reply-to set</>}
                  {sender.via === "smtp" ? <> · via {sender.smtpHost}</> : sender.via === "resend" ? <> · via Resend</> : null}
                </p>
              </div>

              <p className="text-xs text-ink-500">
                No link is required. One that cannot be built for a pharmacy — the rate card for a contact with no
                city — is left out and the wording around it stays. A typo in a placeholder is a different thing: that
                pharmacy is skipped and named afterwards.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSendPlan(null)}>Cancel</Button>
                <Button loading={pending} loadingText="Sending…" onClick={confirmSend}>
                  <Send /> Send {sendPlan?.length === 1 ? "it" : `all ${sendPlan?.length}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {emailFor ? (
        <EmailBuilderDialog
          contact={emailFor}
          templates={templates}
          rules={rules}
          pharmacyUrl={pharmacyUrl}
          open={emailFor !== null}
          onOpenChange={(o) => !o && setEmailFor(null)}
        />
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title="New contact" className="max-w-xl">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pharmacy name" htmlFor="nc-name" required>
                  <Input id="nc-name" value={draft.pharmacyName} onChange={(e) => setDraft({ ...draft, pharmacyName: e.target.value })} required />
                </Field>
                <Field label="City" htmlFor="nc-city" optional hint="Used for the rate-card link.">
                  <Input id="nc-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </Field>
              </div>
              <Field label="Public email" htmlFor="nc-email" optional hint="Their published business address. One contact per address.">
                <Input id="nc-email" type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
              </Field>
              <Field label="Notes" htmlFor="nc-notes" optional>
                <Textarea id="nc-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" loading={pending}>Add contact</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Whether one row survives the filters.
 *
 * A sent-on date drops anything never sent: a contact with no send date was
 * not sent that day, or any other. The filter bar says so rather than leaving
 * it to be discovered.
 */
function matches(r: Row, f: Filters): boolean {
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    const hay = `${r.pharmacy_name} ${r.contact_email ?? ""} ${r.city ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.city === "__none") {
    if (r.city?.trim()) return false;
  } else if (f.city && r.city?.trim() !== f.city) return false;

  if (f.stage === "__unsub") {
    if (!r.unsubscribed_at) return false;
  } else if (f.stage && r.stage !== f.stage) return false;

  if (f.sentOn) {
    if (!r.sent_at) return false;
    if (localDay(r.sent_at) !== f.sentOn) return false;
  }
  return true;
}
