"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, PackageCheck, X, Ban } from "lucide-react";
import type { OrderStatus } from "@getmed/db/types";
import { availableActions } from "@getmed/core/orders/state-machine";
import { Button, Dialog, DialogContent, Field, Textarea, toast } from "@getmed/ui";
import { acceptOrderAction, cancelOrderAction, markReadyAction, rejectOrderAction } from "@/lib/actions/orders";

type Props = { orderId: string; status: OrderStatus; compact?: boolean };

export function OrderActions({ orderId, status, compact }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const actions = availableActions(status, "pharmacy");
  if (actions.length === 0) return compact ? null : <p className="text-sm text-ink-500">No actions available — the order is past your control.</p>;

  const exec = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(success);
        setDialog(null);
        setReason("");
        router.refresh();
      } else toast.error(r.error ?? "Failed");
    });

  const size = compact ? "sm" : "md";
  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes("accept") ? <Button size={size} loading={pending} loadingText="Accepting…" onClick={() => exec(() => acceptOrderAction(orderId), "Order accepted")}><Check /> Accept</Button> : null}
      {actions.includes("reject") ? <Button size={size} variant="outline" disabled={pending} onClick={() => setDialog("reject")}><X /> Reject</Button> : null}
      {actions.includes("mark_ready") ? <Button size={size} loading={pending} loadingText="Updating…" onClick={() => exec(() => markReadyAction(orderId), "Marked ready for delivery")}><PackageCheck /> Ready for delivery</Button> : null}
      {actions.includes("cancel") ? <Button size={size} variant="ghost" className="text-danger-500" disabled={pending} onClick={() => setDialog("cancel")}><Ban /> Cancel</Button> : null}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent
          title={dialog === "reject" ? "Reject this order" : "Cancel this order"}
          description={dialog === "reject" ? "The patient will be contacted by GetMed support. Please give a reason." : "You accepted this order; cancelling escalates it to GetMed support, who will contact the patient."}
        >
          <Field label="Reason" htmlFor="reason" required>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={dialog === "reject" ? "e.g. Medication out of stock, prescription unclear…" : "e.g. Supplier delay, patient requested cancellation…"} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>Back</Button>
            <Button
              variant="danger"
              loading={pending}
              loadingText="Submitting…"
              disabled={reason.trim().length < 3}
              onClick={() => exec(() => (dialog === "reject" ? rejectOrderAction(orderId, reason) : cancelOrderAction(orderId, reason)), dialog === "reject" ? "Order rejected" : "Order cancelled")}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
