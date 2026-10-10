"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { DeliveryRateCardRow } from "@getmed/db/types";
import { formatRateList, parseRateList } from "@getmed/core/pricing";
import { slugify } from "@getmed/core/format";
import {
  Alert, Badge, Button, Dialog, DialogContent, Field, Input, Switch,
  TBody, TD, TH, THead, TR, Table, Textarea, toast,
} from "@getmed/ui";
import { deleteRateCard, saveRateCard, setRateCardPublished } from "@/lib/actions/rate-cards";

type Card = DeliveryRateCardRow & { rows: { destination: string; price: number }[] };
type Draft = { id?: string; city: string; slug: string; note: string; published: boolean; rates: string };

const EMPTY: Draft = { city: "", slug: "", note: "", published: true, rates: "" };

const PLACEHOLDER = "Vaughan 5, Mississauga, Brampton 7, Richmond Hill 6";

export function RateCardsEditor({ cards, pharmacyUrl }: { cards: Card[]; pharmacyUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  // Parsed as it is typed, so the admin sees the rows the page will show
  // before saving rather than after publishing.
  const preview = useMemo(() => (draft ? parseRateList(draft.rates) : null), [draft]);
  const url = (slug: string) => `${pharmacyUrl}/delivery-rates/${slug}`;

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await saveRateCard(draft);
      if (r.ok) {
        toast.success("Rate card saved");
        setDraft(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const open = (c?: Card) =>
    setDraft(
      c
        ? { id: c.id, city: c.city, slug: c.slug, note: c.note ?? "", published: c.published, rates: formatRateList(c.rows) }
        : EMPTY,
    );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => open()}><Plus /> New rate card</Button>
      </div>

      {cards.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-500">
          No rate cards yet. Add one for each city you quote, and send pharmacies the link.
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <THead>
              <TR><TH>City</TH><TH>Public link</TH><TH>Destinations</TH><TH>Published</TH><TH /></TR>
            </THead>
            <TBody>
              {cards.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.city}</TD>
                  <TD>
                    <a href={url(c.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand-700 hover:underline">
                      /delivery-rates/{c.slug} <ExternalLink className="size-3" />
                    </a>
                  </TD>
                  <TD className="text-ink-600">{c.rows.length}</TD>
                  <TD>
                    <Switch
                      checked={c.published}
                      disabled={pending}
                      onCheckedChange={(v) =>
                        start(async () => {
                          const r = await setRateCardPublished(c.id, v);
                          if (r.ok) router.refresh();
                          else toast.error(r.error);
                        })
                      }
                    />
                  </TD>
                  <TD className="text-right">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => open(c)}><Pencil /></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      className="text-danger-500"
                      onClick={() =>
                        start(async () => {
                          const r = await deleteRateCard(c.id);
                          if (r.ok) router.refresh();
                          else toast.error(r.error);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit rate card" : "New rate card"} className="max-w-2xl">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" htmlFor="rc-city" required hint="The city the pharmacy is in.">
                  <Input id="rc-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} required />
                </Field>
                <Field label="Link" htmlFor="rc-slug" hint="Taken from the city if left blank.">
                  <Input id="rc-slug" value={draft.slug} placeholder={slugify(draft.city)} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                </Field>
              </div>

              <Field
                label="Rates"
                htmlFor="rc-rates"
                required
                hint="Type them the way you'd say them. A city with no rate of its own takes the next one, so “Mississauga, Brampton 7” charges 7 for both."
              >
                <Textarea id="rc-rates" rows={4} placeholder={PLACEHOLDER} value={draft.rates} onChange={(e) => setDraft({ ...draft, rates: e.target.value })} />
              </Field>

              {preview && preview.errors.length > 0 ? (
                <Alert tone="warning" title="Fix these before saving">
                  <ul className="ml-4 list-disc">{preview.errors.map((m) => <li key={m}>{m}</li>)}</ul>
                </Alert>
              ) : null}

              {preview && preview.rows.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {preview.rows.length} destination{preview.rows.length === 1 ? "" : "s"}, as the page will show them
                  </p>
                  <ul className="grid list-none gap-x-8 gap-y-1.5 rounded-xl border border-ink-200 p-3.5 text-sm sm:grid-cols-2">
                    {preview.rows.map((r) => (
                      <li key={r.destination} className="flex justify-between gap-4">
                        <span className="text-ink-700">{r.destination}</span>
                        <span className="font-semibold text-ink-950">${r.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Field label="Note" htmlFor="rc-note" optional hint="Shown under the table, if this city needs something said about it.">
                <Input id="rc-note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
                Published <Badge>{draft.published ? "anyone with the link can see it" : "hidden — the link 404s"}</Badge>
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" loading={pending} disabled={!preview || preview.errors.length > 0 || preview.rows.length === 0}>Save</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
