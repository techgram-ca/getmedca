"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { IssueRow } from "@getmed/db/types";
import { Badge, Button, Dialog, DialogContent, Field, Input, Switch, TBody, TD, TH, THead, TR, Table, Textarea, toast } from "@getmed/ui";
import { deleteIssue, upsertIssue } from "@/lib/actions/config";

type Draft = { id?: string; name: string; slug: string; description: string; active: boolean };

export function IssuesEditor({ issues }: { issues: IssueRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = () => start(async () => { if (!draft) return; const r = await upsertIssue(draft); if (r.ok) { toast.success("Saved"); setDraft(null); router.refresh(); } else toast.error(r.error); });
  const toggle = (i: IssueRow) => start(async () => { const r = await upsertIssue({ id: i.id, name: i.name, slug: i.slug, description: i.description ?? "", active: !i.active }); if (r.ok) router.refresh(); else toast.error(r.error); });
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setDraft({ name: "", slug: "", description: "", active: true })}><Plus /> New category</Button></div>
      <div className="surface overflow-hidden"><Table>
        <THead><TR><TH>Name</TH><TH>Slug</TH><TH>Description</TH><TH>Active</TH><TH></TH></TR></THead>
        <TBody>{issues.map((i) => (
          <TR key={i.id}><TD className="font-medium">{i.name}</TD><TD className="font-mono text-xs text-ink-500">{i.slug}</TD><TD className="max-w-md text-ink-600">{i.description}</TD><TD><Switch checked={i.active} onCheckedChange={() => toggle(i)} disabled={pending} /></TD>
            <TD className="text-right"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft({ id: i.id, name: i.name, slug: i.slug, description: i.description ?? "", active: i.active })}><Pencil /></Button><Button size="icon" variant="ghost" className="text-danger-500" aria-label="Delete" onClick={() => start(async () => { const r = await deleteIssue(i.id); if (r.ok) router.refresh(); else toast.error(r.error); })}><Trash2 /></Button></TD></TR>
        ))}</TBody>
      </Table></div>
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit category" : "New category"}>
          {draft ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Name" htmlFor="iname" required><Input id="iname" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
            <Field label="Slug" htmlFor="islug" hint="URL-friendly; generated from the name if blank."><Input id="islug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
            <Field label="Description" htmlFor="idesc"><Textarea id="idesc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Active <Badge>{draft.active ? "visible to patients" : "hidden"}</Badge></label>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" loading={pending}>Save</Button></div>
          </form> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
