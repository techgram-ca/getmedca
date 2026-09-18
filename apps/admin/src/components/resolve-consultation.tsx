"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Textarea, toast } from "@getmed/ui";
import { resolveConsultation } from "@/lib/actions/consultations";

export function ResolveConsultation({ id, status, note }: { id: string; status: string; note: string | null }) {
  const router = useRouter();
  const [n, setN] = useState(note ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Field label="Note" htmlFor="anote"><Textarea id="anote" rows={4} value={n} onChange={(e) => setN(e.target.value)} /></Field>
      <Button loading={pending} disabled={status === "resolved"} onClick={() => start(async () => { const r = await resolveConsultation(id, n); if (r.ok) { toast.success("Resolved"); router.refresh(); } else toast.error(r.error); })}>{status === "resolved" ? "Resolved" : "Mark resolved"}</Button>
    </div>
  );
}
