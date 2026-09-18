"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Pencil, Star, Trash2 } from "lucide-react";
import type { PharmacistRow } from "@getmed/db/types";
import { Avatar, Badge, Button, Card, CardContent, Checkbox, Dialog, DialogContent, EmptyState, Field, Input, Textarea, toast } from "@getmed/ui";
import { deletePharmacist, upsertPharmacist } from "@/lib/actions/profile";
import { TagInput } from "./tag-input";
import { UploadField } from "./upload-field";

type Row = PharmacistRow & { photoUrl: string | null };
type Draft = { id?: string; name: string; credentials: string; yearsExperience: string; bio: string; languages: string[]; isMain: boolean; photo: { path: string | null; url: string | null } };
const empty: Draft = { name: "", credentials: "", yearsExperience: "", bio: "", languages: [], isMain: false, photo: { path: null, url: null } };

export function PharmacistsEditor({ pharmacists, embedded, onChanged }: { pharmacists: Row[]; embedded?: boolean; onChanged?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await upsertPharmacist({ id: draft.id, name: draft.name, credentials: draft.credentials, yearsExperience: draft.yearsExperience === "" ? null : Number(draft.yearsExperience), bio: draft.bio, languages: draft.languages, isMain: draft.isMain || pharmacists.length === 0, photoPath: draft.photo.path });
      if (r.ok) {
        toast.success("Pharmacist saved");
        setDraft(null);
        router.refresh();
        onChanged?.();
      } else toast.error(r.error);
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {!embedded ? <p className="text-sm text-ink-600">Patients see your main pharmacist prominently and the rest as a list.</p> : <span />}
        <Button size="sm" onClick={() => setDraft({ ...empty, isMain: pharmacists.length === 0 })}><Plus /> Add pharmacist</Button>
      </div>
      {pharmacists.length === 0 ? (
        <EmptyState title="No pharmacists yet" description="Add at least your pharmacist-in-charge." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pharmacists.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="flex items-start gap-3">
                  <Avatar src={s.photoUrl} name={s.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">{s.name}{s.is_main ? <Badge tone="brand"><Star className="size-3" /> Main</Badge> : null}</p>
                    <p className="text-sm text-ink-500">{[s.credentials, s.years_experience != null ? `${s.years_experience} yrs` : null].filter(Boolean).join(" · ")}</p>
                    {s.languages.length ? <p className="mt-1 text-xs text-ink-500">{s.languages.join(", ")}</p> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft({ id: s.id, name: s.name, credentials: s.credentials ?? "", yearsExperience: s.years_experience?.toString() ?? "", bio: s.bio ?? "", languages: s.languages, isMain: s.is_main, photo: { path: s.photo_path, url: s.photoUrl } })}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" className="text-danger-500" onClick={() => start(async () => { await deletePharmacist(s.id); router.refresh(); onChanged?.(); })}><Trash2 /></Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit pharmacist" : "Add pharmacist"} className="max-w-xl">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="flex gap-4">
                <UploadField kind="pharmacist" label="Photo" value={draft.photo} onChange={(photo) => setDraft({ ...draft, photo })} />
                <div className="flex-1 space-y-3">
                  <Field label="Name" htmlFor="pname" required><Input id="pname" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
                  <Field label="Credentials" htmlFor="pcred" hint="e.g. RPh, PharmD"><Input id="pcred" value={draft.credentials} onChange={(e) => setDraft({ ...draft, credentials: e.target.value })} /></Field>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Years of experience" htmlFor="pyrs" optional><Input id="pyrs" type="number" min={0} max={70} value={draft.yearsExperience} onChange={(e) => setDraft({ ...draft, yearsExperience: e.target.value })} /></Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={draft.isMain} onCheckedChange={(v) => setDraft({ ...draft, isMain: v === true })} /> Main pharmacist</label>
              </div>
              <Field label="Languages" htmlFor="plang" optional><TagInput value={draft.languages} onChange={(languages) => setDraft({ ...draft, languages })} placeholder="English, French, Punjabi…" /></Field>
              <Field label="Short bio" htmlFor="pbio" optional><Textarea id="pbio" rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} /></Field>
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" loading={pending}>Save</Button></div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
