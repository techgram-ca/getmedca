"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, BadgeCheck, Ban, Check, Copy, Mail, Pencil, Save, Send, Trash2 } from "lucide-react";
import { slugify } from "@getmed/core/format";
import { joinUrl, OUTCOMES, OUTCOME_LABELS, STAGE_LABELS, type LinkRule, type Outcome, type OutreachStage } from "@getmed/core/outreach";
import {
  Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent,
  Field, Input, Select, TBody, TD, TH, THead, TR, Table, Textarea, toast,
} from "@getmed/ui";
import { deleteContact, linkPharmacy, markSent, markSignedUp, saveContact, setUnsubscribed } from "@/lib/actions/outreach";
import { EmailBuilderDialog } from "./email-builder-dialog";
import type { Template } from "./email-template-editor";
import { STAGE_TONE } from "./tracking-table";

type Contact = {
  id: string; token: string; pharmacy_name: string; contact_email: string | null; city: string | null;
  sent_at: string | null; pharmacy_id: string | null; manual_signed_up_at: string | null;
  outcome: string; notes: string | null; unsubscribed_at: string | null; created_at: string;
};
type Summary = {
  human: number; bot: number; days: number;
  byDestination: Record<string, number>; firstHuman: string | null; lastHuman: string | null;
};
type VisitRow = { id: string; created_at: string; likely_bot: boolean; kind: string; path: string | null; user_agent: string | null };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export function ContactDetail({
  contact, stage, confirmed, linkedPharmacyName, summary, visits, pharmacies, rules, templates, pharmacyUrl,
}: {
  contact: Contact;
  stage: OutreachStage;
  confirmed: boolean;
  linkedPharmacyName: string | null;
  summary: Summary;
  visits: VisitRow[];
  pharmacies: { id: string; name: string }[];
  rules: LinkRule[];
  templates: Template[];
  pharmacyUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [outcome, setOutcome] = useState(contact.outcome as Outcome);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [draft, setDraft] = useState({
    pharmacyName: contact.pharmacy_name,
    contactEmail: contact.contact_email ?? "",
    city: contact.city ?? "",
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (done) toast.success(done);
        router.refresh();
      } else toast.error(r.error ?? "Failed");
    });

  const copy = async (key: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1600);
  };

  // The same shape the email offers: the bare link, then one per rule, with
  // an appending rule pointed at this pharmacy's own city.
  const links = [
    { key: "pitch", label: "Pitch link", url: joinUrl(pharmacyUrl, `i/${contact.token}`) },
    ...rules
      .filter((r) => r.slug !== "")
      .filter((r) => !r.appends_rest || !!contact.city)
      .map((r) => ({
        key: r.slug,
        label: r.label,
        url: joinUrl(pharmacyUrl, `i/${contact.token}/${r.appends_rest ? `${r.slug}/${slugify(contact.city ?? "")}` : r.slug}`),
      })),
    { key: "unsub", label: "Unsubscribe link", url: joinUrl(pharmacyUrl, `u/${contact.token}`) },
  ];

  const signedUpStage = stage === "signed_up" || stage === "submitted" || stage === "approved";

  return (
    <div className="max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/tracking"><ArrowLeft /> All contacts</Link>
      </Button>

      {/* Unsubscribed is the one fact that changes what you may do next, so it
          goes above everything rather than into a column. */}
      {contact.unsubscribed_at ? (
        <Alert tone="danger" title="Do not contact — this pharmacy unsubscribed">
          <p className="font-semibold">
            They asked to stop receiving these emails on {when(contact.unsubscribed_at)}. Do not send them another
            pitch or follow-up.
          </p>
          <Button size="sm" variant="outline" className="mt-3" disabled={pending} onClick={() => run(() => setUnsubscribed(contact.id, false), "Unsubscribe undone")}>
            This was a mail scanner — undo it
          </Button>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">{contact.pharmacy_name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {[contact.city, contact.contact_email].filter(Boolean).join(" · ") || "No city or email on file"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge tone={STAGE_TONE[stage]}>{STAGE_LABELS[stage]}</Badge>
            {signedUpStage ? (
              confirmed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success-500">
                  <BadgeCheck className="size-3.5" /> linked to {linkedPharmacyName}
                </span>
              ) : (
                <span className="text-xs text-ink-500">marked by hand, no account linked</span>
              )
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setEmailOpen(true)}><Mail /> Get full email</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
          {confirmDelete ? (
            <>
              <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => {
                const r = await deleteContact(contact.id);
                if (r.ok) router.push("/tracking");
                else toast.error(r.error);
              })}>
                Delete, breaking the link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-danger-500" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>
          )}
        </div>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Days visited" value={summary.days === 0 ? "—" : String(summary.days)} hint="A scanner hits once; a person comes back" />
        <Stat label="Real hits" value={summary.human === 0 ? "—" : String(summary.human)} hint={summary.bot > 0 ? `${summary.bot} filtered as bot` : "none filtered"} />
        <Stat label="First opened" value={summary.firstHuman ? when(summary.firstHuman) : "—"} />
        <Stat label="Last opened" value={summary.lastHuman ? when(summary.lastHuman) : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* ---- Which links pulled ---- */}
          <Card>
            <CardHeader><CardTitle>What they opened</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(summary.byDestination).length === 0 ? (
                <p className="text-sm text-ink-500">Nothing yet, bots aside.</p>
              ) : (
                <ul className="list-none space-y-1.5">
                  {Object.entries(summary.byDestination)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, n]) => (
                      <li key={key} className="flex items-center justify-between gap-4 text-sm">
                        <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">{key}</code>
                        <span className="font-semibold text-ink-900">{n}</span>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ---- Full visit log ---- */}
          <Card>
            <CardHeader><CardTitle>Every hit</CardTitle></CardHeader>
            <CardContent className="p-0">
              {visits.length === 0 ? (
                <p className="p-5 text-sm text-ink-500">No hits recorded.</p>
              ) : (
                <Table>
                  <THead><TR><TH>When</TH><TH>Link</TH><TH>Kind</TH><TH>Agent</TH></TR></THead>
                  <TBody>
                    {visits.slice(0, 50).map((v) => (
                      <TR key={v.id} className={v.likely_bot ? "opacity-50" : undefined}>
                        <TD className="whitespace-nowrap text-xs">{when(v.created_at)}</TD>
                        <TD className="font-mono text-xs">{v.path ?? "—"}</TD>
                        <TD>
                          {v.likely_bot ? <Badge tone="neutral">bot</Badge> : v.kind === "signup" ? <Badge tone="brand">signed up</Badge> : v.kind === "unsubscribe" ? <Badge tone="danger">unsubscribed</Badge> : <Badge tone="success">person</Badge>}
                        </TD>
                        <TD className="max-w-[18ch] truncate text-xs text-ink-400" title={v.user_agent ?? ""}>{v.user_agent ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {/* ---- Actions ---- */}
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Email sent</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={contact.sent_at ? "ghost" : "secondary"}
                    disabled={pending}
                    onClick={() => run(() => markSent(contact.id, !contact.sent_at), contact.sent_at ? "Unmarked" : "Marked as sent")}
                  >
                    <Send /> {contact.sent_at ? "Unmark" : "Mark as sent"}
                  </Button>
                  <span className="text-sm text-ink-600">{when(contact.sent_at)}</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  The bot filter needs this: a hit within a minute of the send is a mail scanner, not a person.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Signed up</p>
                <Select
                  aria-label="Link to a pharmacy account"
                  className="mt-1.5"
                  value={contact.pharmacy_id ?? ""}
                  disabled={pending}
                  onChange={(e) => run(() => linkPharmacy(contact.id, e.target.value || null), "Linked")}
                >
                  <option value="">Not linked to an account</option>
                  {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                {!contact.pharmacy_id ? (
                  <label className="mt-2 flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!contact.manual_signed_up_at}
                      disabled={pending}
                      onChange={(e) => run(() => markSignedUp(contact.id, e.target.checked), "Saved")}
                    />
                    <span>
                      Mark signed up anyway
                      <span className="block text-xs text-ink-500">For one you cannot match to an account.</span>
                    </span>
                  </label>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Outcome</p>
                <Select
                  aria-label="Outcome"
                  className="mt-1.5"
                  value={outcome}
                  disabled={pending}
                  onChange={(e) => {
                    const next = e.target.value as Outcome;
                    setOutcome(next);
                    run(() => saveContact({ ...draft, id: contact.id, outcome: next, notes }), "Saved");
                  }}
                >
                  {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                </Select>
              </div>

              {!contact.unsubscribed_at ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger-500"
                  disabled={pending}
                  onClick={() => run(() => setUnsubscribed(contact.id, true), "Marked do-not-contact")}
                >
                  <Ban /> They asked to stop
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {/* ---- Notes ---- */}
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was said, and what to do next." />
              <Button
                size="sm"
                className="mt-3"
                disabled={pending || notes === (contact.notes ?? "")}
                onClick={() => run(() => saveContact({ ...draft, id: contact.id, outcome, notes }), "Notes saved")}
              >
                <Save /> Save notes
              </Button>
            </CardContent>
          </Card>

          {/* ---- Links ---- */}
          <Card>
            <CardHeader><CardTitle>Links</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {links.map((l) => (
                <div key={l.key} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-700">{l.label}</p>
                    <p className="truncate font-mono text-[0.68rem] text-ink-400" title={l.url}>{l.url}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(l.key, l.url)}>
                    {copied === l.key ? <Check /> : <Copy />}
                  </Button>
                </div>
              ))}
              <p className="pt-1 text-xs text-ink-500">
                Added {when(contact.created_at)}. Destinations are set under Link destinations on the Tracking page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailBuilderDialog
        contact={contact}
        templates={templates}
        rules={rules}
        pharmacyUrl={pharmacyUrl}
        open={emailOpen}
        onOpenChange={setEmailOpen}
      />

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="Edit contact" className="max-w-lg">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveContact({ ...draft, id: contact.id, outcome, notes });
                if (r.ok) { toast.success("Saved"); setEditing(false); router.refresh(); }
                else toast.error(r.error);
              });
            }}
          >
            <Field label="Pharmacy name" htmlFor="ed-name" required>
              <Input id="ed-name" value={draft.pharmacyName} onChange={(e) => setDraft({ ...draft, pharmacyName: e.target.value })} required />
            </Field>
            <Field label="City" htmlFor="ed-city" optional hint="Used for the rate-card link.">
              <Input id="ed-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="Public email" htmlFor="ed-email" optional>
              <Input id="ed-email" type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink-950">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
