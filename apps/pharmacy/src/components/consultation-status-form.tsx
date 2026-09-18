"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ConsultationStatus } from "@getmed/db/types";
import { Button, Field, Select, Textarea, toast } from "@getmed/ui";
import { updateConsultationAction } from "@/lib/actions/consultations";

export function ConsultationStatusForm({ id, status, note }: { id: string; status: ConsultationStatus; note: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState<ConsultationStatus>(status);
  const [n, setN] = useState(note ?? "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateConsultationAction(id, s, n || null);
          if (r.ok) {
            toast.success("Updated");
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      <Field label="Status" htmlFor="status">
        <Select id="status" value={s} onChange={(e) => setS(e.target.value as ConsultationStatus)}>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="resolved">Resolved</option>
        </Select>
      </Field>
      <Field label="Internal note" htmlFor="note" optional>
        <Textarea id="note" value={n} onChange={(e) => setN(e.target.value)} rows={4} placeholder="Outcome of the call, follow-ups…" />
      </Field>
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}
