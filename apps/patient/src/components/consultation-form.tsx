"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { FormFieldConfigRow } from "@getmed/db/types";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  FormError,
  FormErrorSummary,
  Input,
  LoadingOverlay,
  Select,
  Textarea,
  Turnstile,
  focusFirstError,
  type FieldIssue,
} from "@getmed/ui";

type Props = {
  pharmacyId: string;
  pharmacyName: string;
  issues: { id: string; name: string; slug: string }[];
  initialIssue: string;
  service: { id: string; name: string } | null;
  config: FormFieldConfigRow[];
};

const WINDOWS = [
  { v: "morning", l: "Morning (9am – 12pm)" },
  { v: "afternoon", l: "Afternoon (12pm – 5pm)" },
  { v: "evening", l: "Evening (5pm – 8pm)" },
];

export function ConsultationForm({ pharmacyId, pharmacyName, issues, initialIssue, service, config }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [turnstile, setTurnstile] = useState<string | null>(null);
  const required = new Set(config.filter((c) => c.required).map((c) => c.field_key));
  const fe = (k: string) => fieldErrors[k] ?? null;

  const LABELS: Record<string, string> = {
    issueSlug: "Topic",
    patientName: "Your name",
    patientPhone: "Mobile phone",
    description: "What you'd like to discuss",
    callbackWindow: "Best time for a call",
    consent: "Consent",
  };
  const fieldIssues: FieldIssue[] = Object.entries(fieldErrors).map(([field, message]) => ({ field, label: LABELS[field] ?? field, message }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!consent) {
      setFieldErrors({ consent: "Please confirm your consent to continue" });
      setTimeout(() => focusFirstError(), 0);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    setBusy(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pharmacyId,
          issueSlug: g("issueSlug"),
          serviceId: service?.id ?? "",
          patientName: g("patientName"),
          patientPhone: g("patientPhone"),
          description: g("description"),
          callbackWindow: g("callbackWindow"),
          consent,
          turnstileToken: turnstile ?? "",
        }),
      });
      const j = (await res.json()) as { requestId?: string; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok || !j.requestId) {
        setFieldErrors(j.fieldErrors ?? {});
        setError(j.fieldErrors && Object.keys(j.fieldErrors).length ? null : (j.error ?? "Something went wrong"));
        setTimeout(() => focusFirstError(), 0);
        return;
      }
      router.push(`/consultation/verify?requestId=${j.requestId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <LoadingOverlay show={busy} label="Sending your request…" />
      <FormErrorSummary issues={fieldIssues} />
      <FormError message={error} title="We couldn't send your request" />
      <Card>
        <CardContent className="space-y-4">
          {service ? (
            <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">Requesting: <strong>{service.name}</strong></div>
          ) : (
            <Field label="Topic" htmlFor="issueSlug" required error={fe("issueSlug")}>
              <Select id="issueSlug" name="issueSlug" defaultValue={initialIssue} required>
                <option value="" disabled>Choose a topic</option>
                {issues.map((i) => <option key={i.id} value={i.slug}>{i.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="patientName" required error={fe("patientName")}>
              <Input id="patientName" name="patientName" autoComplete="name" required invalid={!!fe("patientName")} />
            </Field>
            <Field label="Mobile phone" htmlFor="patientPhone" required error={fe("patientPhone")} hint="We'll text you a verification code.">
              <Input id="patientPhone" name="patientPhone" type="tel" inputMode="tel" autoComplete="tel" required invalid={!!fe("patientPhone")} />
            </Field>
          </div>
          <Field label="What would you like to discuss?" htmlFor="description" optional={!required.has("description")} required={required.has("description")} error={fe("description")}>
            <Textarea id="description" name="description" rows={4} placeholder="A sentence or two is plenty. Please avoid sharing more than you need to." invalid={!!fe("description")} />
          </Field>
          <Field label="Best time for a call" htmlFor="callbackWindow" optional={!required.has("callback_window")} required={required.has("callback_window")} error={fe("callbackWindow")}>
            <Select id="callbackWindow" name="callbackWindow" defaultValue="">
              <option value="">Any time</option>
              {WINDOWS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span className="text-ink-700">I consent to GetMed sharing this request with <strong>{pharmacyName}</strong> so a pharmacist can call me, and to receiving an SMS verification code.</span>
          </label>
          {fe("consent") ? <p className="text-sm font-medium text-danger-500">{fe("consent")}</p> : null}
          <Turnstile onToken={setTurnstile} />
          <Button type="submit" size="lg" loading={busy} loadingText="Sending your request…" className="w-full sm:w-auto">
            Continue to phone verification <ArrowRight />
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
