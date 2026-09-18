"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PharmacyServiceRow } from "@getmed/db/types";
import { formatCurrency } from "@getmed/core/format";
import { Button, Card, CardContent, Dialog, DialogContent, EmptyState, Field, Input, Textarea, toast } from "@getmed/ui";
import { deleteService, upsertService } from "@/lib/actions/profile";

type Draft = { id?: string; name: string; description: string; price: string; durationMinutes: string };
const empty: Draft = { name: "", description: "", price: "", durationMinutes: "" };

export function ServicesEditor({ services, embedded, onChanged }: { services: PharmacyServiceRow[]; embedded?: boolean; onChanged?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await upsertService({ id: draft.id, name: draft.name, description: draft.description, price: draft.price === "" ? null : Number(draft.price), durationMinutes: draft.durationMinutes === "" ? null : Number(draft.durationMinutes) });
      if (r.ok) {
        toast.success("Service saved");
        setDraft(null);
        router.refresh();
        onChanged?.();
      } else toast.error(r.error);
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {!embedded ? <p className="text-sm text-ink-600">Paid services are informational — patients request a call and settle with you directly.</p> : <span />}
        <Button size="sm" onClick={() => setDraft(empty)}><Plus /> Add service</Button>
      </div>
      {services.length === 0 ? (
        <EmptyState title="No services yet" description="Add things like travel consultations, injections or compounding." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><p className="font-medium">{s.name}</p>{s.price != null ? <span className="text-sm font-semibold text-brand-700">{formatCurrency(s.price)}</span> : null}</div>
                    {s.description ? <p className="mt-1 text-sm text-ink-600">{s.description}</p> : null}
                    {s.duration_minutes ? <p className="mt-1 text-xs text-ink-500">{s.duration_minutes} min</p> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft({ id: s.id, name: s.name, description: s.description ?? "", price: s.price?.toString() ?? "", durationMinutes: s.duration_minutes?.toString() ?? "" })}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" className="text-danger-500" onClick={() => start(async () => { await deleteService(s.id); router.refresh(); onChanged?.(); })}><Trash2 /></Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit service" : "Add service"}>
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Name" htmlFor="sname" required><Input id="sname" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
              <Field label="Description" htmlFor="sdesc" optional><Textarea id="sdesc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (CAD)" htmlFor="sprice" optional><Input id="sprice" type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
                <Field label="Duration (min)" htmlFor="sdur" optional><Input id="sdur" type="number" min={0} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })} /></Field>
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" loading={pending}>Save</Button></div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
