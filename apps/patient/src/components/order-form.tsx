"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, CheckCircle2, FileText, FileUp, Lock, MapPin } from "lucide-react";
import type { FormFieldConfigRow } from "@getmed/db/types";
import {
  AddressAutocomplete,
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  FormError,
  FormErrorSummary,
  Input,
  LoadingOverlay,
  Textarea,
  Turnstile,
  cn,
  focusFirstError,
  type AddressValue,
  type FieldIssue,
} from "@getmed/ui";

type Props = {
  pharmacy: { id: string; name: string; offersTransfer: boolean };
  config: FormFieldConfigRow[];
  /** Address the patient already searched with; when present we confirm rather than re-ask. */
  initialAddress: string;
  initialCoords: { lat: number; lng: number } | null;
  initialType: "new" | "transfer";
};

/** Human labels + the input id to focus, keyed by the error keys the API returns. */
const FIELD_META: Record<string, { label: string; id: string }> = {
  patientName: { label: "Full name", id: "patientName" },
  patientDob: { label: "Date of birth", id: "patientDob" },
  patientPhone: { label: "Mobile phone", id: "patientPhone" },
  deliveryAddress: { label: "Delivery address", id: "deliveryAddress" },
  prescription: { label: "Prescription upload", id: "prescription" },
  insurance: { label: "Insurance", id: "insuranceProvider" },
  healthCard: { label: "Health card", id: "healthCardNumber" },
  notes: { label: "Notes", id: "notes" },
  allergies: { label: "Allergies", id: "allergies" },
  transferFromPharmacyName: { label: "Current pharmacy", id: "transferFromPharmacyName" },
  transferFromPhone: { label: "Current pharmacy phone", id: "transferFromPhone" },
  transferPrescriptionNumber: { label: "Prescription number", id: "transferPrescriptionNumber" },
  consent: { label: "Consent", id: "consent-checkbox" },
};

type Mode = "upload" | "manual";

export function OrderForm({ pharmacy, config, initialAddress, initialCoords, initialType }: Props) {
  const router = useRouter();
  const [type, setType] = useState<"new" | "transfer">(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstile, setTurnstile] = useState<string | null>(null);

  const [addressText, setAddressText] = useState(initialAddress);
  const [address, setAddress] = useState<AddressValue | null>(
    initialAddress
      ? { line: initialAddress, full: initialAddress, lat: initialCoords?.lat ?? null, lng: initialCoords?.lng ?? null }
      : null,
  );
  // Known address arrives from search: show it for confirmation instead of an empty field.
  const [editingAddress, setEditingAddress] = useState(!initialAddress);
  const [insuranceMode, setInsuranceMode] = useState<Mode>("upload");
  const [healthMode, setHealthMode] = useState<Mode>("manual");
  const [consent, setConsent] = useState(false);

  const required = useMemo(() => {
    const applies = type === "new" ? "new_order" : "transfer";
    return new Set(config.filter((c) => c.applies_to === applies && c.required).map((c) => c.field_key));
  }, [config, type]);

  const issues: FieldIssue[] = Object.entries(fieldErrors).map(([field, message]) => ({
    field: FIELD_META[field]?.id ?? field,
    label: FIELD_META[field]?.label ?? field,
    message,
  }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!consent) {
      setFieldErrors({ consent: "Please confirm your consent to continue" });
      setTimeout(() => focusFirstError(), 0);
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    const g = (k: string) => String(fd.get(k) ?? "");

    const payload = {
      pharmacyId: pharmacy.id,
      orderType: type,
      patientName: g("patientName"),
      patientDob: g("patientDob"),
      patientPhone: g("patientPhone"),
      deliveryAddress: {
        line: address?.line ?? addressText,
        city: address?.city ?? null,
        postalCode: address?.postalCode ?? null,
        lat: address?.lat ?? null,
        lng: address?.lng ?? null,
      },
      insuranceProvider: g("insuranceProvider"),
      insuranceMemberId: g("insuranceMemberId"),
      insuranceGroupNumber: g("insuranceGroupNumber"),
      healthCardNumber: g("healthCardNumber"),
      healthCardVersion: g("healthCardVersion"),
      notes: g("notes"),
      allergies: g("allergies"),
      transferFromPharmacyName: g("transferFromPharmacyName"),
      transferFromPhone: g("transferFromPhone"),
      transferFromFax: g("transferFromFax"),
      transferPrescriptionNumber: g("transferPrescriptionNumber"),
      consent,
    };

    const body = new FormData();
    body.set("payload", JSON.stringify(payload));
    body.set("turnstileToken", turnstile ?? "");
    for (const k of ["prescription", "insurance", "healthCard"] as const) {
      const f = fd.get(k);
      if (f instanceof File && f.size > 0) body.set(k, f);
    }

    setBusy(true);
    try {
      const res = await fetch("/api/orders", { method: "POST", body });
      const j = (await res.json()) as { orderId?: string; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok || !j.orderId) {
        setFieldErrors(j.fieldErrors ?? {});
        setError(j.fieldErrors && Object.keys(j.fieldErrors).length ? null : (j.error ?? "Something went wrong"));
        setTimeout(() => focusFirstError(), 0);
        return;
      }
      router.push(`/order/verify?orderId=${j.orderId}`);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setTimeout(() => focusFirstError(), 0);
    } finally {
      setBusy(false);
    }
  }

  const fe = (k: string) => fieldErrors[k] ?? null;

  return (
    <form onSubmit={onSubmit} className="relative grid gap-6 lg:grid-cols-[1fr_18rem]">
      <LoadingOverlay show={busy} label="Sending your order…" />
      <div className="space-y-6">
        <FormErrorSummary issues={issues} />
        <FormError message={error} title="We couldn't submit your order" />

        <OrderTypePicker value={type} onChange={setType} offersTransfer={pharmacy.offersTransfer} />

        <Section title="About the patient" step={1}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="patientName" required error={fe("patientName")} className="sm:col-span-2">
              <Input id="patientName" name="patientName" autoComplete="name" required invalid={!!fe("patientName")} />
            </Field>
            <Field label="Date of birth" htmlFor="patientDob" required={required.has("patient_dob")} optional={!required.has("patient_dob")} error={fe("patientDob")}>
              <Input id="patientDob" name="patientDob" type="date" max={new Date().toISOString().slice(0, 10)} invalid={!!fe("patientDob")} />
            </Field>
            <Field label="Mobile phone" htmlFor="patientPhone" required hint="We'll text a 6-digit code to verify." error={fe("patientPhone")}>
              <Input id="patientPhone" name="patientPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(416) 555-0123" required invalid={!!fe("patientPhone")} />
            </Field>
          </div>
        </Section>

        <Section title="Delivery address" step={2}>
          {editingAddress ? (
            <Field
              label="Address"
              htmlFor="deliveryAddress"
              required
              error={fe("deliveryAddress")}
              hint="Pick a suggestion so the driver gets exact directions."
            >
              <AddressAutocomplete
                id="deliveryAddress"
                value={addressText}
                onChange={(t) => {
                  setAddressText(t);
                  setAddress(null);
                }}
                onSelect={setAddress}
                placeholder="Street address, city"
                invalid={!!fe("deliveryAddress")}
                autoFocus={!!initialAddress}
              />
            </Field>
          ) : (
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-ink-200 bg-brand-50/60 p-4">
              <p className="flex min-w-0 items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">Delivering to</span>
                  <span className="block font-medium text-ink-950">{addressText}</span>
                </span>
              </p>
              <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => setEditingAddress(true)}>
                Change
              </Button>
            </div>
          )}
          <Field label="Unit / buzzer / delivery notes" htmlFor="notes" optional={!required.has("notes")} required={required.has("notes")} error={fe("notes")} className="mt-4">
            <Textarea id="notes" name="notes" rows={2} placeholder="Apt 4B, buzz 204. Leave with concierge if not home." />
          </Field>
        </Section>

        {type === "new" ? (
          <Section title="Your prescription" step={3}>
            <Field label="Prescription" htmlFor="prescription" required={required.has("prescription_file")} hint="Photo or PDF, up to 20 MB. Make sure the whole page is visible." error={fe("prescription")}>
              <FileDrop id="prescription" name="prescription" accept="image/*,.pdf" invalid={!!fe("prescription")} />
            </Field>
          </Section>
        ) : (
          <Section title="Where is your prescription now?" step={3}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current pharmacy name" htmlFor="transferFromPharmacyName" required={required.has("transfer_from_pharmacy")} error={fe("transferFromPharmacyName")} className="sm:col-span-2">
                <Input id="transferFromPharmacyName" name="transferFromPharmacyName" invalid={!!fe("transferFromPharmacyName")} />
              </Field>
              <Field label="Their phone" htmlFor="transferFromPhone" required={required.has("transfer_from_contact")} error={fe("transferFromPhone")}>
                <Input id="transferFromPhone" name="transferFromPhone" type="tel" invalid={!!fe("transferFromPhone")} />
              </Field>
              <Field label="Their fax" htmlFor="transferFromFax" optional>
                <Input id="transferFromFax" name="transferFromFax" type="tel" />
              </Field>
              <Field label="Prescription number" htmlFor="transferPrescriptionNumber" optional={!required.has("transfer_prescription_number")} required={required.has("transfer_prescription_number")} hint="Printed on your medication label, if you have it." error={fe("transferPrescriptionNumber")}>
                <Input id="transferPrescriptionNumber" name="transferPrescriptionNumber" invalid={!!fe("transferPrescriptionNumber")} />
              </Field>
            </div>
          </Section>
        )}

        <Section title="Insurance" step={4} optional={!required.has("insurance")} error={fe("insurance")}>
          <ModeToggle value={insuranceMode} onChange={setInsuranceMode} labels={["Upload card", "Enter details"]} />
          {insuranceMode === "upload" ? (
            <FileDrop id="insurance" name="insurance" accept="image/*,.pdf" className="mt-3" />
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label="Provider" htmlFor="insuranceProvider"><Input id="insuranceProvider" name="insuranceProvider" placeholder="e.g. Sun Life" /></Field>
              <Field label="Member ID" htmlFor="insuranceMemberId"><Input id="insuranceMemberId" name="insuranceMemberId" /></Field>
              <Field label="Group #" htmlFor="insuranceGroupNumber"><Input id="insuranceGroupNumber" name="insuranceGroupNumber" /></Field>
            </div>
          )}
        </Section>

        <Section title="Health card" step={5} optional={!required.has("health_card")} error={fe("healthCard")}>
          <ModeToggle value={healthMode} onChange={setHealthMode} labels={["Upload card", "Enter number"]} />
          {healthMode === "upload" ? (
            <FileDrop id="healthCard" name="healthCard" accept="image/*,.pdf" className="mt-3" />
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Health card number" htmlFor="healthCardNumber"><Input id="healthCardNumber" name="healthCardNumber" inputMode="numeric" placeholder="1234 567 890" /></Field>
              <Field label="Version code" htmlFor="healthCardVersion"><Input id="healthCardVersion" name="healthCardVersion" maxLength={2} placeholder="AB" /></Field>
            </div>
          )}
        </Section>

        <Section title="Anything the pharmacist should know?" step={6} optional>
          <Field label="Allergies or notes" htmlFor="allergies">
            <Textarea id="allergies" name="allergies" rows={3} placeholder="Allergies, other medications, preferred brands…" />
          </Field>
        </Section>

        <Card>
          <CardContent className="space-y-4">
            <label htmlFor="consent-checkbox" className="flex cursor-pointer items-start gap-3 text-sm">
              <Checkbox id="consent-checkbox" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span className="text-ink-700">
                I consent to GetMed sharing my prescription and delivery details with <strong>{pharmacy.name}</strong> for the purpose of filling and delivering this order, and to receiving SMS updates about it. <span className="text-ink-500">Learn more in our <a href="/faq" className="underline">FAQ</a>.</span>
              </span>
            </label>
            {fe("consent") ? <p className="text-sm font-medium text-danger-500">{fe("consent")}</p> : null}
            <Turnstile onToken={setTurnstile} />
            <Button type="submit" size="lg" loading={busy} loadingText="Sending your order…" className="w-full sm:w-auto">
              Continue to phone verification <ArrowRight />
            </Button>
            <p className="text-xs text-ink-400">You&#39;ll confirm your phone number on the next step. Nothing is sent to the pharmacy until then.</p>
          </CardContent>
        </Card>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <Card>
            <CardContent className="space-y-3 text-sm text-ink-600">
              <p className="flex items-start gap-2"><Lock className="mt-0.5 size-4 shrink-0 text-brand-600" /> Documents are encrypted and only visible to {pharmacy.name}.</p>
              <p>Next: we'll text you a code to confirm your number, then the pharmacy is notified instantly.</p>
              <p className="text-xs text-ink-500">Payment for your medication is arranged with the pharmacy directly.</p>
            </CardContent>
          </Card>
        </div>
      </aside>
    </form>
  );
}

function OrderTypePicker({
  value,
  onChange,
  offersTransfer,
}: {
  value: "new" | "transfer";
  onChange: (v: "new" | "transfer") => void;
  offersTransfer: boolean;
}) {
  const OPTIONS = [
    { id: "new" as const, label: "New prescription", desc: "Upload a prescription", icon: FileText, enabled: true },
    { id: "transfer" as const, label: "Transfer prescription", desc: "Move it from another pharmacy", icon: ArrowLeftRight, enabled: offersTransfer },
  ];
  return (
    <div role="radiogroup" aria-label="Order type" className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!o.enabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-soft focus-ring disabled:cursor-not-allowed disabled:opacity-50",
              active ? "border-brand-600 bg-brand-50" : "border-ink-200 bg-white hover:border-brand-300",
            )}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>
              <o.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className={cn("block font-bold", active ? "text-brand-800" : "text-ink-950")}>{o.label}</span>
              <span className="block text-xs text-ink-500">{o.enabled ? o.desc : "Not offered by this pharmacy"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, step, optional, error, children }: { title: string; step: number; optional?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <Card className={cn(error && "ring-2 ring-danger-500/40")}>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{step}</span> {title}
          </h2>
          {optional ? <span className="text-xs text-ink-400">Optional</span> : null}
        </div>
        {error ? <p className="mb-3 text-xs text-danger-500" role="alert">{error}</p> : null}
        {children}
      </CardContent>
    </Card>
  );
}

function ModeToggle({ value, onChange, labels }: { value: Mode; onChange: (m: Mode) => void; labels: [string, string] }) {
  return (
    <div className="inline-flex rounded-lg bg-ink-100 p-1 text-sm">
      {(["upload", "manual"] as Mode[]).map((m, i) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn("rounded-md px-3 py-1.5 font-medium transition-soft", value === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-600")}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

function FileDrop({ id, name, accept, className, invalid }: { id: string; name: string; accept: string; className?: string; invalid?: boolean }) {
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-sm transition-soft hover:border-brand-600 hover:bg-brand-50/50",
        invalid ? "border-danger-500 bg-red-50/40" : file ? "border-brand-600 bg-brand-50/60" : "border-ink-300",
        className,
      )}
    >
      {file ? <CheckCircle2 className="size-5 shrink-0 text-brand-600" /> : <FileUp className="size-5 shrink-0 text-brand-600" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink-800">{file ? file.name : "Tap to choose a photo or PDF"}</span>
        <span className="block text-xs text-ink-500">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · tap to replace` : "JPEG, PNG, HEIC or PDF, up to 20 MB"}
        </span>
      </span>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setFile(f ? { name: f.name, size: f.size } : null);
        }}
      />
    </label>
  );
}
