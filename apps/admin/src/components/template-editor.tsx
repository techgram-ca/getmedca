"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, MessageSquare, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, Field, Input, Switch, Textarea, cn, toast } from "@getmed/ui";
import { resetTemplate, saveTemplate } from "@/lib/actions/config";

export type TemplateRow = {
  event: string; label: string; recipient: string; channel: "sms" | "email"; placeholders: string[]; required: string[];
  editable: boolean; subject: string | null; text: string; enabled: boolean; isDefault: boolean;
};

export function TemplateEditor({ rows }: { rows: TemplateRow[] }) {
  const events = [...new Set(rows.map((r) => r.event))];
  return (
    <div className="space-y-6">
      {events.map((ev) => {
        const group = rows.filter((r) => r.event === ev);
        const first = group[0]!;
        return (
          <section key={ev}>
            <div className="mb-2 flex items-center gap-2"><h2 className="font-semibold">{first.label}</h2><Badge tone="brand">→ {first.recipient}</Badge>{!first.editable ? <Badge tone="neutral">text locked</Badge> : null}</div>
            <div className="grid gap-4 lg:grid-cols-2">{group.map((r) => <TemplateCard key={r.channel} r={r} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function TemplateCard({ r }: { r: TemplateRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(r.text);
  const [subject, setSubject] = useState(r.subject ?? "");
  const [enabled, setEnabled] = useState(r.enabled);
  const dirty = text !== r.text || subject !== (r.subject ?? "") || enabled !== r.enabled;
  const save = () => start(async () => { const res = await saveTemplate({ event: r.event, channel: r.channel, subject, text, enabled }); if (res.ok) { toast.success("Template saved"); router.refresh(); } else toast.error(res.error); });
  const reset = () => start(async () => { const res = await resetTemplate(r.event, r.channel); if (res.ok) { toast.success("Reset to default"); router.refresh(); } else toast.error(res.error); });
  return (
    <Card className={cn(!enabled && "opacity-70")}>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">{r.channel === "sms" ? <MessageSquare className="size-4" /> : <Mail className="size-4" />} {r.channel.toUpperCase()}</span>
          <label className="flex items-center gap-2 text-xs text-ink-500">{enabled ? "On" : "Off"}<Switch checked={enabled} onCheckedChange={setEnabled} /></label>
        </div>
        {r.channel === "email" ? <Field label="Subject" htmlFor={`${r.event}-${r.channel}-s`}><Input id={`${r.event}-${r.channel}-s`} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!r.editable} /></Field> : null}
        <Field label="Message" htmlFor={`${r.event}-${r.channel}-t`}><Textarea id={`${r.event}-${r.channel}-t`} rows={r.channel === "sms" ? 3 : 5} value={text} onChange={(e) => setText(e.target.value)} disabled={!r.editable} className="font-mono text-xs" /></Field>
        <div className="flex flex-wrap gap-1">{r.placeholders.map((p) => <button key={p} type="button" disabled={!r.editable} onClick={() => setText((t) => `${t} {${p}}`)} className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[11px]", r.required.includes(p) ? "border-accent-300 bg-accent-50 text-accent-800" : "border-ink-200 bg-ink-50 text-ink-600")} title={r.required.includes(p) ? "Required" : "Optional"}>{`{${p}}`}</button>)}</div>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={reset} disabled={r.isDefault || pending}><RotateCcw /> Reset to default</Button>
          <Button size="sm" onClick={save} loading={pending} disabled={!dirty}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
