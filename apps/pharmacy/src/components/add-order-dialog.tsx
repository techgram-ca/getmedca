"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AddressAutocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  Field,
  FormError,
  FormErrorSummary,
  Input,
  LoadingOverlay,
  Select,
  Textarea,
  cn,
  toast,
  type AddressValue,
  type FieldIssue,
} from "@getmed/ui";
import { createManualOrdersAction } from "@/lib/actions/orders";
import { DeliveryQuote } from "./delivery-quote";

type Row = {
  key: number;
  orderType: "new" | "transfer";
  patientName: string;
  patientPhone: string;
  patientDob: string;
  addressText: string;
  address: AddressValue | null;
  deliveryNotes: string;
  allergies: string;
  transferFromPharmacyName: string;
  transferFromPhone: string;
  transferPrescriptionNumber: string;
  consentConfirmed: boolean;
};

let nextKey = 1;
const blank = (): Row => ({
  key: nextKey++, orderType: "new", patientName: "", patientPhone: "", patientDob: "", addressText: "", address: null,
  deliveryNotes: "", allergies: "", transferFromPharmacyName: "", transferFromPhone: "", transferPrescriptionNumber: "", consentConfirmed: false,
});

/**
 * "Add order" — the pharmacy enters orders taken by phone or in store.
 * Supports several orders in one submission; each row is validated and the
 * whole batch is rejected if any row fails, so nothing is half-created.
 */
export function AddOrderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const LABELS: Record<string, string> = {
    patientName: "Patient name",
    patientPhone: "Mobile phone",
    patientDob: "Date of birth",
    deliveryAddress: "Delivery address",
    consentConfirmed: "Consent confirmation",
  };
  const summary: FieldIssue[] = Object.entries(errors).flatMap(([idx, fields]) =>
    Object.entries(fields).map(([field, message]) => ({
      field: `${field}-${rows[Number(idx)]?.key ?? idx}`,
      label: `Order ${Number(idx) + 1} — ${LABELS[field] ?? field}`,
      message,
    })),
  );
  const reset = () => {
    setRows([blank()]);
    setErrors({});
    setError(null);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      setErrors({});
      // A typed address has no coordinates or postal code, so the order could
      // not be priced or routed. The picker supplies both.
      const unpicked = rows.findIndex((row) => row.address?.lat == null || row.address.lng == null || !row.address.postalCode);
      if (unpicked >= 0) {
        setErrors({ [unpicked]: { deliveryAddress: "Choose the address from the list of suggestions so we can price the delivery" } });
        setError("Check the highlighted address");
        return;
      }
      const r = await createManualOrdersAction({
        orders: rows.map((row) => ({
          orderType: row.orderType,
          patientName: row.patientName,
          patientPhone: row.patientPhone,
          patientDob: row.patientDob,
          deliveryAddress: { line: row.address?.line ?? row.addressText, city: row.address?.city ?? null, postalCode: row.address?.postalCode ?? null, lat: row.address?.lat ?? null, lng: row.address?.lng ?? null },
          deliveryNotes: row.deliveryNotes,
          allergies: row.allergies,
          transferFromPharmacyName: row.transferFromPharmacyName,
          transferFromPhone: row.transferFromPhone,
          transferPrescriptionNumber: row.transferPrescriptionNumber,
          consentConfirmed: row.consentConfirmed,
        })),
      });
      if (!r.ok) {
        setError(r.error);
        setErrors(r.rowErrors ?? {});
        return;
      }
      toast.success(r.created.length === 1 ? "Order added" : `${r.created.length} orders added`);
      setOpen(false);
      reset();
      router.refresh();
    });

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus /> Add order</Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent
          title="Add order"
          description="For prescriptions you took by phone or in store. Orders are created as accepted and skip the patient's OTP step."
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <div className="relative">
            <LoadingOverlay show={pending} label="Creating orders…" />
            <div className="space-y-3">
              <FormErrorSummary issues={summary} />
              <FormError message={summary.length ? null : error} title="We couldn't create these orders" />
            </div>
          <div className="mt-3 space-y-4">
            {rows.map((row, i) => {
              const fe = (k: string) => errors[i]?.[k] ?? (k === "deliveryAddress" ? errors[i]?.["deliveryAddress"] : null);
              return (
                <fieldset key={row.key} className={cn("rounded-xl border border-ink-200 p-4", errors[i] && "border-danger-500/60")}>
                  <div className="mb-3 flex items-center justify-between">
                    <legend className="text-sm font-semibold">Order {i + 1}</legend>
                    {rows.length > 1 ? <Button type="button" size="sm" variant="ghost" className="text-danger-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}><Trash2 /> Remove</Button> : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Type" htmlFor={`type-${row.key}`}>
                      <Select id={`type-${row.key}`} value={row.orderType} onChange={(e) => update(i, { orderType: e.target.value as Row["orderType"] })}>
                        <option value="new">New prescription</option>
                        <option value="transfer">Transfer</option>
                      </Select>
                    </Field>
                    <Field label="Date of birth" htmlFor={`patientDob-${row.key}`} optional error={fe("patientDob")}>
                      <Input id={`patientDob-${row.key}`} type="date" value={row.patientDob} onChange={(e) => update(i, { patientDob: e.target.value })} />
                    </Field>
                    <Field label="Patient name" htmlFor={`patientName-${row.key}`} required error={fe("patientName")}>
                      <Input id={`patientName-${row.key}`} value={row.patientName} onChange={(e) => update(i, { patientName: e.target.value })} invalid={!!fe("patientName")} />
                    </Field>
                    <Field label="Mobile phone" htmlFor={`patientPhone-${row.key}`} required error={fe("patientPhone")} hint="Receives SMS delivery updates.">
                      <Input id={`patientPhone-${row.key}`} type="tel" value={row.patientPhone} onChange={(e) => update(i, { patientPhone: e.target.value })} invalid={!!fe("patientPhone")} />
                    </Field>
                    <Field label="Delivery address" htmlFor={`deliveryAddress-${row.key}`} required className="sm:col-span-2" error={fe("deliveryAddress")}>
                      <AddressAutocomplete
                        id={`deliveryAddress-${row.key}`}
                        value={row.addressText}
                        onChange={(t) => update(i, { addressText: t, address: null })}
                        onSelect={(a) => update(i, { address: a })}
                        placeholder="Street address, city"
                        invalid={!!fe("deliveryAddress")}
                      />
                      <DeliveryQuote address={row.address} className="mt-2" />
                    </Field>
                    {row.orderType === "transfer" ? (
                      <>
                        <Field label="Current pharmacy" htmlFor={`tfp-${row.key}`}><Input id={`tfp-${row.key}`} value={row.transferFromPharmacyName} onChange={(e) => update(i, { transferFromPharmacyName: e.target.value })} /></Field>
                        <Field label="Their phone / Rx #" htmlFor={`tph-${row.key}`}>
                          <div className="flex gap-2">
                            <Input id={`tph-${row.key}`} placeholder="Phone" value={row.transferFromPhone} onChange={(e) => update(i, { transferFromPhone: e.target.value })} />
                            <Input placeholder="Rx #" aria-label="Prescription number" value={row.transferPrescriptionNumber} onChange={(e) => update(i, { transferPrescriptionNumber: e.target.value })} />
                          </div>
                        </Field>
                      </>
                    ) : null}
                    <Field label="Delivery notes" htmlFor={`notes-${row.key}`} optional><Input id={`notes-${row.key}`} placeholder="Unit, buzzer, drop-off instructions" value={row.deliveryNotes} onChange={(e) => update(i, { deliveryNotes: e.target.value })} /></Field>
                    <Field label="Allergies / notes for driver" htmlFor={`all-${row.key}`} optional><Textarea id={`all-${row.key}`} rows={1} value={row.allergies} onChange={(e) => update(i, { allergies: e.target.value })} /></Field>
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-xs text-ink-700">
                    <Checkbox checked={row.consentConfirmed} onCheckedChange={(v) => update(i, { consentConfirmed: v === true })} className="mt-0.5" />
                    <span>The patient consented to delivery through GetMed and to receiving SMS updates at this number.{fe("consentConfirmed") ? <span className="block text-danger-500">{fe("consentConfirmed")}</span> : null}</span>
                  </label>
                </fieldset>
              );
            })}
          </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={rows.length >= 20} onClick={() => setRows((rs) => [...rs, blank()])}><Plus /> Add another order</Button>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" loading={pending} loadingText="Creating…" onClick={submit}>{rows.length > 1 ? `Create ${rows.length} orders` : "Create order"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
