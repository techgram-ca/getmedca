"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, Copy, Mail, Plus, RotateCcw } from "lucide-react";
import {
  OUTCOMES, OUTREACH_STAGES, joinUrl, STAGE_LABELS,
  type LinkRule, type Outcome, type OutreachStage,
} from "@getmed/core/outreach";
import {
  Badge, Button, Dialog, DialogContent, Field, FilterSelect, Input, Select,
  TBody, TD, TH, THead, TR, Table, Textarea, toast,
} from "@getmed/ui";
import { saveContact } from "@/lib/actions/outreach";
import { OUTCOME_LABELS } from "@getmed/core/outreach";
import { EmailBuilderDialog } from "./email-builder-dialog";
import type { Template } from "./email-template-editor";

type Row = {
  id: string; token: string; pharmacy_name: string; contact_email: string | null; city: string | null;
  unsubscribed_at: string | null; stage: OutreachStage; confirmed: boolean;
  outcome: string; sent_at: string | null; created_at: string;
  visits: { human: number; days: number };
};
type Draft = { pharmacyName: string; contactEmail: string; city: string; outcome: Outcome; notes: string };

const EMPTY: Draft = { pharmacyName: "", contactEmail: "", city: "", outcome: "new", notes: "" };

export const STAGE_TONE: Record<OutreachStage, "neutral" | "brand" | "success" | "warning"> = {
  new: "neutral", sent: "neutral", visited: "warning", signed_up: "brand", submitted: "brand", approved: "success",
};

/** Which timestamp the date window applies to. */
type DateField = "sent_at" | "created_at";

type Filters = {
  q: string;
  city: string;
  stage: string;
  outcome: string;
  dateField: DateField;
  from: string;
  to: string;
};

const NO_FILTERS: Filters = { q: "", city: "", stage: "", outcome: "", dateField: "sent_at", from: "", to: "" };

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
  rows, templates, rules, pharmacyUrl,
}: {
  rows: Row[];
  templates: Template[];
  rules: LinkRule[];
  pharmacyUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<Row | null>(null);
  const [f, setF] = useState<Filters>(NO_FILTERS);

  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const shown = useMemo(() => rows.filter((r) => matches(r, f)), [rows, f]);
  const active = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

  const copy = async (id: string, token: string) => {
    await navigator.clipboard.writeText(joinUrl(pharmacyUrl, `i/${token}`));
    setCopied(id);
    toast.success("Pitch link copied");
    setTimeout(() => setCopied(null), 1600);
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

          <FilterSelect value={f.outcome} onChange={(v) => set("outcome", v)} label="Outcome">
            <option value="">Any outcome</option>
            {OUTCOMES.map((o) => <option key={o} value={o}>{o === "new" ? "No outcome yet" : OUTCOME_LABELS[o]}</option>)}
          </FilterSelect>

          {/* The three date controls wrap as one block. Split across a line
              break they read as a stray select and an orphaned "to".
              Which date is being filtered is a real question here — "added"
              and "sent" are days or weeks apart — so it is asked, not guessed. */}
          <div className="flex items-center gap-1.5">
            <FilterSelect value={f.dateField} onChange={(v) => set("dateField", v as DateField)} label="Date field">
              <option value="sent_at">Sent</option>
              <option value="created_at">Added</option>
            </FilterSelect>
            <Input
              type="date" value={f.from} max={f.to || undefined} aria-label="From date"
              className="h-9 w-[9.5rem] text-sm" onChange={(e) => set("from", e.target.value)}
            />
            <span className="text-sm text-ink-400">to</span>
            <Input
              type="date" value={f.to} min={f.from || undefined} aria-label="To date"
              className="h-9 w-[9.5rem] text-sm" onChange={(e) => set("to", e.target.value)}
            />
          </div>

          <Button size="sm" variant="ghost" onClick={() => setF(NO_FILTERS)} disabled={!active}>
            <RotateCcw /> Reset
          </Button>
          <Button size="sm" onClick={() => setDraft(EMPTY)}><Plus /> New contact</Button>
        </div>

        <p className="mt-2 text-xs text-ink-500">
          {shown.length === rows.length ? (
            <>{rows.length} contact{rows.length === 1 ? "" : "s"}</>
          ) : (
            <>Showing <span className="font-semibold text-ink-950">{shown.length}</span> of {rows.length}</>
          )}
          {(f.from || f.to) && f.dateField === "sent_at" ? " · contacts never sent are excluded by a sent-date window" : null}
        </p>
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
              <TR><TH>Pharmacy</TH><TH>Stage</TH><TH>Visits</TH><TH>Links &amp; email</TH><TH /></TR>
            </THead>
            <TBody>
              {shown.map((c) => (
                <TR key={c.id} className={c.unsubscribed_at ? "opacity-55" : undefined}>
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
                    {!c.confirmed && (c.stage === "signed_up" || c.stage === "submitted" || c.stage === "approved") ? (
                      <p className="mt-1 text-xs text-ink-500">marked by hand</p>
                    ) : null}
                  </TD>

                  <TD className="text-sm">
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
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => copy(c.id, c.token)}>
                        {copied === c.id ? <Check /> : <Copy />} Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEmailFor(c)}>
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
              <Field label="Outcome" htmlFor="nc-outcome">
                <Select id="nc-outcome" value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value as Outcome })}>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                </Select>
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
 * A date window on "sent" drops anything never sent: a contact with no send
 * date did not happen in that period, or in any other. The filter bar says so
 * rather than leaving it to be discovered.
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

  if (f.outcome && r.outcome !== f.outcome) return false;

  if (f.from || f.to) {
    const stamp = f.dateField === "sent_at" ? r.sent_at : r.created_at;
    if (!stamp) return false;
    const day = stamp.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
  }
  return true;
}
