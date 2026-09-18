"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Textarea, toast } from "@getmed/ui";
import { escalationAction } from "@/lib/actions/orders";

export function EscalationForm({ orderId, status, note }: { orderId: string; status: string; note: string | null }) {
  const router = useRouter();
  const [n, setN] = useState(note ?? "");
  const [pending, start] = useTransition();
  const run = (s: "contacted" | "resolved") => start(async () => { const r = await escalationAction(orderId, s, n); if (r.ok) { toast.success(`Marked ${s}`); router.refresh(); } else toast.error(r.error); });
  return (
    <div className="space-y-3">
      <Field label="Outcome note" htmlFor="note"><Textarea id="note" rows={3} value={n} onChange={(e) => setN(e.target.value)} placeholder="Spoke with patient; re-routed to another pharmacy…" /></Field>
      <div className="flex gap-2">
        <Button variant="outline" loading={pending} onClick={() => run("contacted")} disabled={status === "resolved"}>Mark contacted</Button>
        <Button loading={pending} onClick={() => run("resolved")} disabled={status === "resolved"}>Mark resolved</Button>
        {status === "resolved" ? <span className="self-center text-sm text-green-700">Resolved</span> : null}
      </div>
    </div>
  );
}
