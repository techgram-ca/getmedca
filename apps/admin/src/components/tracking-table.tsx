"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronRight, Copy, Plus } from "lucide-react";
import { OUTCOMES, joinUrl, STAGE_LABELS, type Outcome, type OutreachStage } from "@getmed/core/outreach";
import { Badge, Button, Dialog, DialogContent, Field, Input, Select, TBody, TD, TH, THead, TR, Table, Textarea, toast } from "@getmed/ui";
import { saveContact } from "@/lib/actions/outreach";
import { OUTCOME_LABELS } from "@getmed/core/outreach";

type Row = {
  id: string; token: string; pharmacy_name: string; city: string | null;
  unsubscribed_at: string | null; stage: OutreachStage; confirmed: boolean;
  visits: { human: number; days: number };
};
type Draft = { pharmacyName: string; contactEmail: string; city: string; outcome: Outcome; notes: string };

const EMPTY: Draft = { pharmacyName: "", contactEmail: "", city: "", outcome: "new", notes: "" };

export const STAGE_TONE: Record<OutreachStage, "neutral" | "brand" | "success" | "warning"> = {
  new: "neutral", sent: "neutral", visited: "warning", signed_up: "brand", submitted: "brand", approved: "success",
};

/**
 * The list is five columns on purpose.
 *
 * Everything else — the outcome, the notes, the link variants, the things
 * that change a row — lives on the contact's own page. A table wide enough
 * to hold all of it could not be read at a glance, and reading it at a glance
 * is the only thing a list is for.
 */
export function TrackingTable({ rows, pharmacyUrl }: { rows: Row[]; pharmacyUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDraft(EMPTY)}><Plus /> New contact</Button>
      </div>

      {rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-500">
          No contacts yet. Add a pharmacy, copy its link, and paste it into the email you write.
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead>
              <TR><TH>Pharmacy</TH><TH>Stage</TH><TH>Visits</TH><TH>Pitch link</TH><TH /></TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id} className={c.unsubscribed_at ? "opacity-55" : undefined}>
                  <TD>
                    <p className="font-medium">{c.pharmacy_name}</p>
                    <p className="text-xs text-ink-500">{c.city ?? "—"}</p>
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
                    <Button size="sm" variant="outline" onClick={() => copy(c.id, c.token)}>
                      {copied === c.id ? <Check /> : <Copy />} Copy
                    </Button>
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
              <Field label="Public email" htmlFor="nc-email" optional hint="Their published business address.">
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
