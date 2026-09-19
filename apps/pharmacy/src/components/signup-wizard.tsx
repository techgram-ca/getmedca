"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CloudUpload, Loader2 } from "lucide-react";
import type { WeeklyHours } from "@getmed/core/hours";
import { AddressAutocomplete, Alert, Button, Card, CardContent, Checkbox, Field, Input, Logo, Switch, Textarea, cn, toast } from "@getmed/ui";
import { advanceStep, saveStep1, saveStep2, saveStep5, saveStep6, submitSignup } from "@/lib/actions/profile";
import { logout } from "@/lib/actions/auth";
import type { ProfileData } from "@/lib/load-profile";
import { HoursEditor } from "./hours-editor";
import { PharmacistsEditor } from "./pharmacists-editor";
import { ServicesEditor } from "./services-editor";
import { TagInput } from "./tag-input";
import { UploadField } from "./upload-field";

const STEPS = ["Business", "Licensing", "Pharmacists", "Services", "Hours & delivery", "Branding", "Review"];
const INSURERS = ["OHIP / ODB", "Sun Life", "Manulife", "Canada Life", "Green Shield", "Blue Cross", "Desjardins", "Express Scripts", "NIHB", "Trillium"];

type SaveState = "idle" | "saving" | "saved" | "error";

export function SignupWizard({ data }: { data: ProfileData }) {
  const router = useRouter();
  const p = data.pharmacy;
  const [step, setStep] = useState(Math.min(Math.max(p.signup_step, 1), 7));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ---- draft state (mirrors DB row; autosaved per step) ----
  const [s1, setS1] = useState({ name: p.name ?? "", addressLine: p.address_line ?? "", city: p.city ?? "", postalCode: p.postal_code ?? "", lat: null as number | null, lng: null as number | null, phone: p.phone ?? "", email: p.email ?? "" });
  const [addressText, setAddressText] = useState([p.address_line, p.city, p.postal_code].filter(Boolean).join(", "));
  const [s2, setS2] = useState({ licenseNumber: p.license_number ?? "", licenseCollege: p.license_college ?? "Ontario College of Pharmacists", picName: p.pic_name ?? "", picLicenseNumber: p.pic_license_number ?? "" });
  const [license, setLicense] = useState({ path: p.license_doc_path, url: p.licenseUrl });
  const [s5, setS5] = useState({ hours: p.hours as WeeklyHours, deliveryRadiusKm: p.delivery_radius_km?.toString() ?? "", estimatedDeliveryTime: p.estimated_delivery_time ?? "", offersDelivery: p.offers_delivery, offersTransfer: p.offers_transfer, offersConsultation: p.offers_consultation, acceptedInsurance: p.accepted_insurance, accessibilityNotes: p.accessibility_notes ?? "", issueIds: data.selectedIssueIds });
  const [s6, setS6] = useState({ tagline: p.tagline ?? "", bio: p.bio ?? "" });
  const [logo, setLogo] = useState({ path: p.logo_path, url: p.logoUrl });
  const [cover, setCover] = useState({ path: p.cover_path, url: p.coverUrl });

  // ---- autosave (debounced 1.2s after any change on the current step) ----
  const persist = useCallback(async (): Promise<boolean> => {
    setSaveState("saving");
    let r: { ok: boolean; error?: string } = { ok: true };
    if (step === 1) r = await saveStep1(s1);
    else if (step === 2) r = await saveStep2(s2, license.path);
    else if (step === 5) r = await saveStep5({ ...s5, deliveryRadiusKm: s5.deliveryRadiusKm === "" ? null : Number(s5.deliveryRadiusKm) });
    else if (step === 6) r = await saveStep6({ ...s6, logoPath: logo.path, coverPath: cover.path });
    setSaveState(r.ok ? "saved" : "error");
    if (!r.ok) setError(r.error ?? "Could not save");
    else setError(null);
    return r.ok;
  }, [step, s1, s2, license.path, s5, s6, logo.path, cover.path]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (![1, 2, 5, 6].includes(step)) return;
    const t = setTimeout(() => void persist(), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1, s2, license.path, s5, s6, logo.path, cover.path]);

  const next = () =>
    start(async () => {
      const ok = [1, 2, 5, 6].includes(step) ? await persist() : (await advanceStep(step + 1)).ok;
      if (!ok) return;
      if (step === 2 && !license.path) {
        setError("Please upload your pharmacy licence document.");
        return;
      }
      setStep((s) => Math.min(7, s + 1));
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
              <StepCard title="Licensing" desc="Verified by GetMed before you go live. Never shown to patients.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pharmacy licence / accreditation number" htmlFor="lic" required><Input id="lic" value={s2.licenseNumber} onChange={(e) => setS2({ ...s2, licenseNumber: e.target.value })} /></Field>
                  <Field label="Issuing college" htmlFor="college" required><Input id="college" value={s2.licenseCollege} onChange={(e) => setS2({ ...s2, licenseCollege: e.target.value })} /></Field>
                  <Field label="Pharmacist-in-charge" htmlFor="pic" required><Input id="pic" value={s2.picName} onChange={(e) => setS2({ ...s2, picName: e.target.value })} /></Field>
                  <Field label="Their licence number" htmlFor="piclic" required><Input id="piclic" value={s2.picLicenseNumber} onChange={(e) => setS2({ ...s2, picLicenseNumber: e.target.value })} /></Field>
                  <div className="sm:col-span-2"><UploadField kind="license" label="Licence document (PDF or image)" value={license} onChange={setLicense} accept="image/*,.pdf" aspect="doc" hint="Certificate of accreditation from the Ontario College of Pharmacists." /></div>
                </div>
              </StepCard>
            ) : null}

            {step === 3 ? (
              <StepCard title="Pharmacists" desc="Add your team. Patients see the main pharmacist first.">
                <PharmacistsEditor pharmacists={data.pharmacists} embedded onChanged={() => router.refresh()} />
              </StepCard>
            ) : null}

            {step === 4 ? (
              <StepCard title="Paid services" desc="Optional. Listed on your page for information; patients request a call and settle with you.">
                <ServicesEditor services={data.services} embedded onChanged={() => router.refresh()} />
              </StepCard>
            ) : null}

            {step === 5 ? (
              <StepCard title="Hours & delivery" desc="Your open/closed indicator updates live on your page.">
                <HoursEditor value={s5.hours} onChange={(hours) => setS5({ ...s5, hours })} />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {([["offersDelivery", "Delivery"], ["offersTransfer", "Transfers"], ["offersConsultation", "Consultations"]] as const).map(([k, l]) => (
                    <label key={k} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm"><span>{l}</span><Switch checked={s5[k]} onCheckedChange={(v) => setS5({ ...s5, [k]: v })} /></label>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Delivery radius (km)" htmlFor="radius" hint="Shown to patients as context. The platform search radius is set by GetMed."><Input id="radius" type="number" min={0} step="0.5" value={s5.deliveryRadiusKm} onChange={(e) => setS5({ ...s5, deliveryRadiusKm: e.target.value })} /></Field>
                  <Field label="Typical delivery time" htmlFor="eta"><Input id="eta" placeholder="e.g. same day" value={s5.estimatedDeliveryTime} onChange={(e) => setS5({ ...s5, estimatedDeliveryTime: e.target.value })} /></Field>
                </div>
                <Field label="Accepted insurance" htmlFor="ins" className="mt-4"><TagInput value={s5.acceptedInsurance} onChange={(v) => setS5({ ...s5, acceptedInsurance: v })} placeholder="Type and press Enter" suggestions={INSURERS} /></Field>
                <Field label="Accessibility notes" htmlFor="acc" optional className="mt-4"><Input id="acc" value={s5.accessibilityNotes} onChange={(e) => setS5({ ...s5, accessibilityNotes: e.target.value })} /></Field>
                <div className="mt-6">
                  <p className="text-sm font-medium">Consultation topics you offer</p>
                  <p className="text-xs text-ink-500">Choose from GetMed's list — patients browse these to find you.</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {data.issues.map((i) => (
                      <label key={i.id} className="flex items-center gap-2 text-sm"><Checkbox checked={s5.issueIds.includes(i.id)} onCheckedChange={(v) => setS5({ ...s5, issueIds: v ? [...s5.issueIds, i.id] : s5.issueIds.filter((x) => x !== i.id) })} /> {i.name}</label>
                    ))}
                  </div>
                </div>
              </StepCard>
            ) : null}

            {step === 6 ? (
              <StepCard title="Branding" desc="Make your page yours.">
                <div className="flex flex-wrap gap-6">
                  <UploadField kind="logo" label="Logo" value={logo} onChange={setLogo} />
                  <div className="min-w-64 flex-1"><UploadField kind="cover" label="Cover photo" value={cover} onChange={setCover} aspect="wide" /></div>
                </div>
                <Field label="Tagline" htmlFor="tagline" className="mt-4"><Input id="tagline" maxLength={120} value={s6.tagline} onChange={(e) => setS6({ ...s6, tagline: e.target.value })} placeholder="Family-owned since 1998. Free delivery on every prescription." /></Field>
                <Field label="About your pharmacy" htmlFor="bio" className="mt-4"><Textarea id="bio" rows={5} maxLength={2000} value={s6.bio} onChange={(e) => setS6({ ...s6, bio: e.target.value })} /></Field>
              </StepCard>
            ) : null}

            {step === 7 ? (
              <StepCard title="Review & submit" desc="Once submitted, our team verifies your licence. You'll get an email when you're approved.">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Item k="Pharmacy" v={s1.name} /><Item k="Address" v={[s1.addressLine, s1.city, s1.postalCode].filter(Boolean).join(", ")} />
                  <Item k="Phone" v={s1.phone} /><Item k="Email" v={s1.email} />
                  <Item k="Licence #" v={s2.licenseNumber} /><Item k="Pharmacist-in-charge" v={s2.picName} />
                  <Item k="Licence document" v={license.path ? "Uploaded" : "Missing"} warn={!license.path} />
                  <Item k="Pharmacists" v={`${data.pharmacists.length} added`} warn={data.pharmacists.length === 0} />
                  <Item k="Services" v={`${data.services.length} listed`} /><Item k="Consultation topics" v={`${s5.issueIds.length} selected`} />
                </dl>
                <Button size="lg" className="mt-6" loading={pending} loadingText="Submitting your profile…" onClick={submit}>Submit for review <Check /></Button>
              </StepCard>
            ) : null}

            <div className="flex items-center justify-between">
              <Button variant="ghost" disabled={step === 1 || pending} onClick={() => setStep((s) => s - 1)}><ArrowLeft /> Back</Button>
              {step < 7 ? <Button loading={pending} loadingText="Saving…" onClick={next}>Continue <ArrowRight /></Button> : null}
            </div>
            <p className="text-center text-xs text-ink-400">Your progress is saved automatically as you type.</p>
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
