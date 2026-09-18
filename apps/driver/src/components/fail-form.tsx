"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Select, Textarea, toast } from "@getmed/ui";
import { failAction } from "@/lib/actions/orders";

const REASONS = [
  { v: "Patient not available", l: "Patient not available" },
  { v: "Wrong address", l: "Wrong or inaccessible address" },
  { v: "Refused", l: "Patient refused delivery" },
  { v: "Other", l: "Other" },
];

export function FailForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("Patient not available");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await failAction(orderId, detail ? `${reason}: ${detail}` : reason); if (r.ok) { toast("Marked as failed — escalated to GetMed"); router.push("/"); router.refresh(); } else toast.error(r.error); }); }}>
      <Field label="Reason" htmlFor="reason"><Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-12 text-base">{REASONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select></Field>
      <Field label="Details" htmlFor="detail" optional><Textarea id="detail" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What happened?" /></Field>
      <Button type="submit" size="lg" variant="danger" className="w-full" loading={pending}>Confirm failed delivery</Button>
    </form>
  );
}
