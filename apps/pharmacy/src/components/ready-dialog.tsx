"use client";

import { useState } from "react";
import { PackageCheck, Snowflake } from "lucide-react";
import { formatCurrency } from "@getmed/core/format";
import { Alert, Button, Checkbox, Dialog, DialogContent, Field, Input } from "@getmed/ui";

export type Handling = { requiresRefrigeration: boolean; hasNarcotics: boolean; cashToCollect: number | null };

/**
 * What the driver needs to know, asked once as the bag is handed over.
 *
 * Refrigeration and narcotics change how the delivery is carried; cash changes
 * what happens at the door. None of it can be worked out from the order, so
 * marking an order ready asks rather than assumes.
 *
 * The refrigeration fee is shown only when there is one. At zero the question
 * still has to be asked — the driver needs a cold bag either way — so it is
 * asked without a price attached rather than hidden.
 */
export function ReadyDialog({
  open,
  onOpenChange,
  refrigerationFee,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refrigerationFee: number;
  pending?: boolean;
  onConfirm: (handling: Handling) => void;
}) {
  const [cold, setCold] = useState(false);
  const [narcotics, setNarcotics] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [amount, setAmount] = useState("");

  const typed = Number(amount);
  const amountValid = !collecting || (amount.trim() !== "" && Number.isFinite(typed) && typed >= 0);

  const confirm = () =>
    onConfirm({
      requiresRefrigeration: cold,
      hasNarcotics: narcotics,
      cashToCollect: collecting && amountValid ? typed : null,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Ready for delivery"
        description="Three things the driver needs to know before collecting this order."
        className="max-w-md"
      >
        <div className="space-y-4">
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={cold} onCheckedChange={(v) => setCold(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium text-ink-950">Needs refrigeration</span>
              <span className="block text-xs text-ink-500">Cold-chain items that must stay refrigerated in transit.</span>
            </span>
          </label>

          {cold && refrigerationFee > 0 ? (
            <Alert tone="info">
              <span className="inline-flex items-center gap-2">
                <Snowflake className="size-4 shrink-0" />
                {formatCurrency(refrigerationFee)} will be added to this delivery.
              </span>
            </Alert>
          ) : null}

          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={narcotics} onCheckedChange={(v) => setNarcotics(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium text-ink-950">Contains a controlled substance</span>
              <span className="block text-xs text-ink-500">The driver hands it to the patient only, against ID.</span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={collecting} onCheckedChange={(v) => setCollecting(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium text-ink-950">Cash to collect on delivery</span>
              <span className="block text-xs text-ink-500">The driver collects this from the patient at the door.</span>
            </span>
          </label>

          {collecting ? (
            <Field label="Amount to collect" htmlFor="cash-amount" error={!amountValid ? "Enter the amount, or clear the tick above" : null}>
              <div className="relative max-w-[10rem]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                <Input
                  id="cash-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  autoFocus
                  className="pl-7"
                  invalid={!amountValid}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </Field>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Back
          </Button>
          <Button type="button" onClick={confirm} loading={pending} loadingText="Updating…" disabled={!amountValid}>
            <PackageCheck /> Mark ready
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
