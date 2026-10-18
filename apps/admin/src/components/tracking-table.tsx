"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Check, Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { OUTCOMES, OUTCOME_LABELS, STAGE_LABELS, joinUrl, type Outcome, type OutreachStage } from "@getmed/core/outreach";
import { slugify } from "@getmed/core/format";
import {
  Badge, Button, Dialog, DialogContent, Field, Input, Select, TBody, TD, TH, THead, TR, Table, Textarea, toast,
} from "@getmed/ui";
import { deleteContact, linkPharmacy, markSent, markSignedUp, saveContact, setUnsubscribed } from "@/lib/actions/outreach";

type Row = {
  id: string; token: string; pharmacy_name: string; contact_email: string | null; city: string | null;
  sent_at: string | null; pharmacy_id: string | null; manual_signed_up_at: string | null;
  outcome: string; notes: string | null; unsubscribed_at: string | null;
  stage: OutreachStage; confirmed: boolean; pharmacyName: string | null;
  visits: { human: number; bot: number; days: number; byDestination: Record<string, number>; lastHuman: string | null };
};
type Pharmacy = { id: string; name: string; status: string };
type Draft = { id?: string; pharmacyName: string; contactEmail: string; city: string; outcome: Outcome; notes: string };

const EMPTY: Draft = { pharmacyName: "", contactEmail: "", city: "", outcome: "new", notes: "" };

const STAGE_TONE: Record<OutreachStage, "neutral" | "brand" | "success" | "warning"> = {
  new: "neutral", sent: "neutral", visited: "warning", signed_up: "brand", submitted: "brand", approved: "success",
};

export function TrackingTable({ rows, pharmacies, pharmacyUrl }: { rows: Row[]; pharmacies: Pharmacy[]; pharmacyUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Deleting throws away a token that is already sitting in somebody's inbox,
  // turning their link into a dead one. Too easy to hit beside the pencil.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const inviteUrl = (token: string, suffix = "") => joinUrl(pharmacyUrl, `i/${token}${suffix ? `/${suffix}` : ""}`);
  const unsubUrl = (token: string) => joinUrl(pharmacyUrl, `u/${token}`);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Failed");
    });

  const copy = async (id: string, url: string, what: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    toast.success(`${what} copied`);
    setTimeout(() => setCopied(null), 1600);
  };

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await saveContact(draft);
      if (r.ok) {
        toast.success("Saved");
        setDraft(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const open = (c?: Row) =>
    setDraft(
      c
        ? {
            id: c.id, pharmacyName: c.pharmacy_name, contactEmail: c.contact_email ?? "", city: c.city ?? "",
            outcome: (OUTCOMES as readonly string[]).includes(c.outcome) ? (c.outcome as Outcome) : "new",
            notes: c.notes ?? "",
          }
        : EMPTY,
    );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => open()}><Plus /> New contact</Button>
      </div>

      {rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-500">
          No contacts yet. Add a pharmacy, copy its link, and paste it into the email you write.
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Pharmacy</TH><TH>Stage</TH><TH>Visits</TH><TH>Outcome</TH><TH>Link</TH><TH />
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id} className={c.unsubscribed_at ? "opacity-55" : undefined}>
                  <TD>
                    <p className="font-medium">{c.pharmacy_name}</p>
                    <p className="text-xs text-ink-500">
                      {[c.city, c.contact_email].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {c.unsubscribed_at ? <Badge tone="danger" className="mt-1">Do not contact</Badge> : null}
                  </TD>

                  <TD>
                    <Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABELS[c.stage]}</Badge>
                    {/* A linked account and a ticked box are not the same claim,
                        and a table that cannot tell them apart is one that lies. */}
                    {c.stage === "signed_up" || c.stage === "submitted" || c.stage === "approved" ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                        {c.confirmed ? (
                          <><BadgeCheck className="size-3 text-success-500" /> {c.pharmacyName}</>
                        ) : (
                          "marked by hand"
                        )}
                      </p>
                    ) : null}
                  </TD>

                  <TD className="text-sm">
                    {c.visits.human === 0 ? (
                      <span className="text-ink-400">none{c.visits.bot > 0 ? ` (${c.visits.bot} bot)` : ""}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-ink-900">{c.visits.days}</span>
                        <span className="text-ink-500"> day{c.visits.days === 1 ? "" : "s"}</span>
                        <p className="text-xs text-ink-500">
                          {c.visits.human} hit{c.visits.human === 1 ? "" : "s"}
                          {c.visits.bot > 0 ? `, ${c.visits.bot} bot` : ""}
                        </p>
                        {/* Which of the links in the email they went for. */}
                        <p className="mt-0.5 text-xs font-medium text-brand-700">
                          {Object.entries(c.visits.byDestination)
                            .sort((a, b) => b[1] - a[1])
                            .map(([k, n]) => `${k}${n > 1 ? ` ×${n}` : ""}`)
                            .join(", ")}
                        </p>
                      </>
                    )}
                  </TD>

                  <TD className="text-sm text-ink-600">
                    {OUTCOME_LABELS[(c.outcome as Outcome) ?? "new"] ?? c.outcome}
                    {c.notes ? <p className="mt-0.5 max-w-[22ch] truncate text-xs text-ink-500" title={c.notes}>{c.notes}</p> : null}
                  </TD>

                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => copy(`${c.id}:pitch`, inviteUrl(c.token), "Pitch link")}>
                        {copied === `${c.id}:pitch` ? <Check /> : <Copy />} Pitch link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(`${c.id}:unsub`, unsubUrl(c.token), "Unsubscribe link")}>
                        {copied === `${c.id}:unsub` ? <Check /> : <Copy />} Unsub link
                      </Button>
                    </div>
                    {/* The same token, pointed somewhere else. Several can go in
                        one email, and which gets opened is the real signal. */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {([
                        ["signup", "signup"],
                        ["demo", "demo"],
                        ...(c.city ? ([[`rates/${slugify(c.city)}`, "rates"]] as [string, string][]) : []),
                      ] as [string, string][]).map(([suffix, label]) => (
                        <button
                          key={suffix}
                          type="button"
                          title={`Copy ${inviteUrl(c.token, suffix)}`}
                          onClick={() => copy(`${c.id}:${suffix}`, inviteUrl(c.token, suffix), `${label} link`)}
                          className="rounded-md border border-ink-200 px-1.5 py-0.5 font-mono text-[0.65rem] text-ink-500 transition-soft hover:border-brand-600 hover:text-brand-700"
                        >
                          {copied === `${c.id}:${suffix}` ? "copied" : `+${label}`}
                        </button>
                      ))}
                    </div>
                  </TD>

                  <TD className="whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant={c.sent_at ? "ghost" : "secondary"}
                      disabled={pending}
                      title={c.sent_at ? `Sent ${new Date(c.sent_at).toLocaleDateString()}` : "Mark as sent"}
                      onClick={() => run(() => markSent(c.id, !c.sent_at))}
                    >
                      <Send /> {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "Mark sent"}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => open(c)}><Pencil /></Button>
                    {confirmDelete === c.id ? (
                      <>
                        <Button
                          size="sm" variant="danger" disabled={pending}
                          onClick={() => { setConfirmDelete(null); run(() => deleteContact(c.id)); }}
                        >
                          Delete, breaking the link
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Keep</Button>
                      </>
                    ) : (
                      <Button
                        size="icon" variant="ghost" aria-label="Delete" className="text-danger-500"
                        onClick={() => setConfirmDelete(c.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Select
                        aria-label="Link to a pharmacy account"
                        className="h-8 w-[13rem] text-xs"
                        value={c.pharmacy_id ?? ""}
                        disabled={pending}
                        onChange={(e) => run(() => linkPharmacy(c.id, e.target.value || null))}
                      >
                        <option value="">Not linked</option>
                        {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                      {!c.pharmacy_id ? (
                        <label className="flex items-center gap-1 text-xs text-ink-600">
                          <input
                            type="checkbox"
                            checked={!!c.manual_signed_up_at}
                            disabled={pending}
                            onChange={(e) => run(() => markSignedUp(c.id, e.target.checked))}
                          />
                          Signed up
                        </label>
                      ) : null}
                      {c.unsubscribed_at ? (
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => run(() => setUnsubscribed(c.id, false))}>
                          Undo unsub
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit contact" : "New contact"} className="max-w-xl">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pharmacy name" htmlFor="oc-name" required>
                  <Input id="oc-name" value={draft.pharmacyName} onChange={(e) => setDraft({ ...draft, pharmacyName: e.target.value })} required />
                </Field>
                <Field label="City" htmlFor="oc-city" optional>
                  <Input id="oc-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </Field>
              </div>

              <Field label="Public email" htmlFor="oc-email" optional hint="Their published business address. Only used so you know who you wrote to.">
                <Input id="oc-email" type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
              </Field>

              <Field label="Outcome" htmlFor="oc-outcome" hint="Your read on the conversation. The stage beside it works itself out.">
                <Select id="oc-outcome" value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value as Outcome })}>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                </Select>
              </Field>

              <Field label="Notes" htmlFor="oc-notes" optional>
                <Textarea id="oc-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" loading={pending}>Save</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
