"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CloudUpload, Loader2 } from "lucide-react";
import { AddressAutocomplete, Alert, Button, Card, CardContent, Field, Input, Logo, cn, toast } from "@getmed/ui";
import { advanceStep, saveSignupIssues, saveStep1, submitSignup } from "@/lib/actions/profile";
import { logout } from "@/lib/actions/auth";
import type { ProfileData } from "@/lib/load-profile";
import { PharmacistsEditor } from "./pharmacists-editor";
import { ServicesEditor } from "./services-editor";
import { IssuePricingEditor } from "./issue-pricing-editor";

const STEPS = ["Business", "Pharmacists", "Services", "Review"];

type SaveState = "idle" | "saving" | "saved" | "error";

export function SignupWizard({ data }: { data: ProfileData }) {
  const router = useRouter();
  const p = data.pharmacy;
  // Clamped: a pharmacy part-way through the old seven-step flow has a stored
  // step that no longer exists.
  const [step, setStep] = useState(Math.min(Math.max(p.signup_step, 1), STEPS.length));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ---- draft state (mirrors the DB row; written on Continue) ----
  const [s1, setS1] = useState({ name: p.name ?? "", addressLine: p.address_line ?? "", city: p.city ?? "", postalCode: p.postal_code ?? "", lat: null as number | null, lng: null as number | null, phone: p.phone ?? "", email: p.email ?? "" });
  const [addressText, setAddressText] = useState([p.address_line, p.city, p.postal_code].filter(Boolean).join(", "));
  const [issues, setIssues] = useState({ issueIds: data.selectedIssueIds, issuePrices: data.issuePrices });

  /**
   * Saves the current step. Called from Continue and nowhere else.
   *
   * This used to run on a 1.2s debounce after every keystroke, which meant the
   * server validated a half-typed pharmacy name and the page showed "Too small:
   * expected string to have >=2 characters" at someone still filling the field
   * in. Nothing is sent until the step is finished.
   */
  const persist = useCallback(async (): Promise<boolean> => {
    setSaveState("saving");
    let r: { ok: boolean; error?: string } = { ok: true };
    if (step === 1) r = await saveStep1(s1);
    else if (step === 2) r = await saveSignupIssues(issues);
    else r = await advanceStep(step + 1);
    setSaveState(r.ok ? "saved" : "error");
    setError(r.ok ? null : r.error ?? "Could not save");
    return r.ok;
  }, [step, s1, issues]);

  const next = () =>
    start(async () => {
      // Topics are a promise to patients that someone will call them back, so
      // they need a pharmacist attached before the step can be left.
      if (step === 2 && issues.issueIds.length > 0 && data.pharmacists.length === 0) {
        setError("Add at least one pharmacist, or remove your consultation topics.");
        return;
      }
      if (!(await persist())) return;
      setStep((s) => Math.min(STEPS.length, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  const submit = () =>
    start(async () => {
      const r = await submitSignup();
      if (!r.ok) {
        setError(r.error ?? "Could not submit");
        return;
      }
      toast.success("Profile submitted for review");
      router.push("/dashboard");
    });

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-4 text-xs text-ink-500">
          <SaveIndicator state={saveState} />
          <form action={logout}><button className="hover:text-ink-900">Sign out</button></form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ol className="mx-auto mb-8 flex max-w-3xl flex-wrap gap-2" aria-label="Progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "current" : "todo";
            return (
              <li key={label}>
                <button type="button" disabled={n > p.signup_step && n > step} onClick={() => n <= Math.max(p.signup_step, step) && setStep(n)}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-soft", state === "current" && "border-brand-600 bg-brand-600 text-white", state === "done" && "border-brand-200 bg-brand-50 text-brand-800", state === "todo" && "border-ink-200 bg-white text-ink-500 disabled:opacity-60")}>
                  <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px]", state === "current" ? "bg-white/20" : state === "done" ? "bg-brand-600 text-white" : "bg-ink-100")}>{state === "done" ? <Check className="size-3" /> : n}</span>{label}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mx-auto max-w-3xl">
          <div className="space-y-6">
            {error ? <Alert tone="danger" title="We couldn't save this step">{error}</Alert> : null}

            {step === 1 ? (
              <StepCard title="Business basics" desc="How patients and GetMed reach you.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pharmacy name" htmlFor="name" required className="sm:col-span-2"><Input id="name" value={s1.name} onChange={(e) => setS1({ ...s1, name: e.target.value })} /></Field>
                  <Field label="Address" htmlFor="address" required className="sm:col-span-2" hint="Choose from the suggestions so we can place you on the map.">
                    <AddressAutocomplete id="address" value={addressText} onChange={setAddressText} onSelect={(a) => setS1({ ...s1, addressLine: a.line, city: a.city ?? "", postalCode: a.postalCode ?? "", lat: a.lat ?? null, lng: a.lng ?? null })} />
                  </Field>
                  <Field label="Phone" htmlFor="phone" required><Input id="phone" type="tel" value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} /></Field>
                  <Field label="Email" htmlFor="email" required><Input id="email" type="email" value={s1.email} onChange={(e) => setS1({ ...s1, email: e.target.value })} /></Field>
                </div>
              </StepCard>
            ) : null}

            {step === 2 ? (
              <StepCard title="Pharmacists & consultations" desc="Topics patients can book you for, and the pharmacists who answer them.">
                <p className="text-sm font-medium">Consultation topics you offer</p>
                <p className="text-xs text-ink-500">
                  Choose from GetMed&apos;s list — patients browse these to find you. Leave a price blank to charge no
                  fee. Select none and consultations stay switched off for your pharmacy.
                </p>
                <div className="mt-2">
                  <IssuePricingEditor
                    issues={data.issues}
                    selected={issues.issueIds}
                    prices={issues.issuePrices}
                    onSelectedChange={(issueIds) => setIssues({ ...issues, issueIds })}
                    onPricesChange={(issuePrices) => setIssues({ ...issues, issuePrices })}
                  />
                </div>

                <hr className="my-6 border-ink-200" />

                <p className="text-sm font-medium">Your pharmacists</p>
                <p className="text-xs text-ink-500">
                  {issues.issueIds.length > 0
                    ? "A topic is a promise that someone will call the patient back, so add at least one pharmacist."
                    : "Patients see the main pharmacist first. You can add them later from your account."}
                </p>
                <div className="mt-2">
                  <PharmacistsEditor pharmacists={data.pharmacists} embedded onChanged={() => router.refresh()} />
                </div>
              </StepCard>
            ) : null}

            {step === 3 ? (
              <StepCard title="Paid services" desc="Optional. Listed on your page for information; patients request a call and settle with you.">
                <ServicesEditor services={data.services} embedded onChanged={() => router.refresh()} />
              </StepCard>
            ) : null}

            {step === 4 ? (
              <StepCard title="Review & submit" desc="Our team checks your details before you go live. You'll get an email when you're approved.">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Item k="Pharmacy" v={s1.name} /><Item k="Address" v={[s1.addressLine, s1.city, s1.postalCode].filter(Boolean).join(", ")} />
                  <Item k="Phone" v={s1.phone} /><Item k="Email" v={s1.email} />
                  <Item k="Pharmacists" v={`${data.pharmacists.length} added`} warn={issues.issueIds.length > 0 && data.pharmacists.length === 0} />
                  <Item k="Services" v={`${data.services.length} listed`} />
                  <Item k="Consultations" v={issues.issueIds.length > 0 ? `${issues.issueIds.length} topics` : "Not offered"} />
                </dl>
                <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
                  Opening hours default to 9am–6pm, closed Sunday, and delivery and transfers are switched on. Change
                  any of it, and add your logo and photos, from your account once you are approved.
                </p>
                <Button size="lg" className="mt-6" loading={pending} loadingText="Submitting your profile…" onClick={submit}>Submit for review <Check /></Button>
              </StepCard>
            ) : null}

            <div className="flex items-center justify-between">
              <Button variant="ghost" disabled={step === 1 || pending} onClick={() => setStep((s) => s - 1)}><ArrowLeft /> Back</Button>
              {step < STEPS.length ? <Button loading={pending} loadingText="Saving…" onClick={next}>Continue <ArrowRight /></Button> : null}
            </div>
            <p className="text-center text-xs text-ink-400">Each step is saved when you continue.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="animate-slide-up">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mb-5 text-sm text-ink-500">{desc}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Item({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{k}</dt>
      <dd className={cn("mt-0.5", warn && "font-medium text-danger-500")}>{v || "—"}</dd>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="inline-flex items-center gap-1 text-brand-700"><CloudUpload className="size-3" /> Saved</span>;
  if (state === "error") return <span className="text-danger-500">Not saved</span>;
  return null;
}
