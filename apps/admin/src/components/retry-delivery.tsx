"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Alert, Button, Field, Textarea, toast } from "@getmed/ui";
import { returnToDeliveryAction } from "@/lib/actions/orders";

/**
 * Puts a failed delivery back in the ready queue for another attempt. The
 * charge for the attempt that failed stands — that trip was already made.
 */
export function RetryDelivery({ orderId, attempt }: { orderId: string; attempt: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await returnToDeliveryAction(orderId, note.trim());
      if (r.ok) {
        toast.success("Back in the delivery queue");
        setOpen(false);
        setNote("");
        router.refresh();
      } else toast.error(r.error);
    });

  if (!open) {
    return (
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}><RotateCcw /> Send out for delivery again</Button>
        <p className="mt-2 text-xs text-ink-500">
          This is delivery attempt {attempt}. The pharmacy has been charged for the failed attempt; the next one is charged separately.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Alert tone="info">
        The order goes back to <strong>ready for delivery</strong>, ready for a driver. Attempt {attempt + 1} is billed on its
        own — the attempt that failed stays on the pharmacy's invoice.
      </Alert>
      <Field label="What changed?" htmlFor="retry-note" optional hint="Saved on the escalation and the order timeline.">
        <Textarea
          id="retry-note"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Spoke to the patient — they'll be home after 5pm."
        />
      </Field>
      <div className="flex gap-2">
        <Button onClick={submit} loading={pending} loadingText="Sending…"><RotateCcw /> Confirm</Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
      </div>
    </div>
  );
}
