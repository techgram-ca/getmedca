"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { AddressAutocomplete, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Switch, Textarea, toast } from "@getmed/ui";
import { DEFAULT_THEME_COLOR } from "@getmed/core/theme";
import { saveProfile } from "@/lib/actions/profile";
import type { ProfileData } from "@/lib/load-profile";
import { PharmacyPreview } from "./pharmacy-preview";
import { TagInput } from "./tag-input";
import { IssuePricingEditor } from "./issue-pricing-editor";
import { ThemeColorPicker } from "./theme-color-picker";
import { UploadField } from "./upload-field";

const INSURERS = ["OHIP / ODB", "Sun Life", "Manulife", "Canada Life", "Green Shield", "Blue Cross", "Desjardins", "Express Scripts", "NIHB", "Trillium"];

export function ProfileForm({ data, patientUrl }: { data: ProfileData; patientUrl: string }) {
  const p = data.pharmacy;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: p.name ?? "", phone: p.phone ?? "", email: p.email ?? "", addressLine: p.address_line ?? "", city: p.city ?? "", postalCode: p.postal_code ?? "",
    lat: null as number | null, lng: null as number | null, tagline: p.tagline ?? "", bio: p.bio ?? "",
    themeColor: p.theme_color ?? DEFAULT_THEME_COLOR,
    deliveryRadiusKm: p.delivery_radius_km ?? "", estimatedDeliveryTime: p.estimated_delivery_time ?? "",
    offersDelivery: p.offers_delivery, offersTransfer: p.offers_transfer, offersConsultation: p.offers_consultation,
    acceptedInsurance: p.accepted_insurance, accessibilityNotes: p.accessibility_notes ?? "", issueIds: data.selectedIssueIds, issuePrices: data.issuePrices,
  });
  const [addressText, setAddressText] = useState([p.address_line, p.city, p.postal_code].filter(Boolean).join(", "));
  const [logo, setLogo] = useState({ path: p.logo_path, url: p.logoUrl });
  const [cover, setCover] = useState({ path: p.cover_path, url: p.coverUrl });
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = () =>
    start(async () => {
      const r = await saveProfile({ ...f, deliveryRadiusKm: f.deliveryRadiusKm === "" ? null : Number(f.deliveryRadiusKm), logoPath: logo.path, coverPath: cover.path });
      if (r.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Card>
          <CardHeader><CardTitle>Business basics</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Pharmacy name" htmlFor="name" required className="sm:col-span-2"><Input id="name" value={f.name} onChange={(e) => up("name", e.target.value)} required /></Field>
            <Field label="Address" htmlFor="address" required className="sm:col-span-2">
              <AddressAutocomplete id="address" value={addressText} onChange={setAddressText} onSelect={(a) => { setF((s) => ({ ...s, addressLine: a.line, city: a.city ?? "", postalCode: a.postalCode ?? "", lat: a.lat ?? null, lng: a.lng ?? null })); }} />
            </Field>
            <Field label="Phone" htmlFor="phone" required><Input id="phone" type="tel" value={f.phone} onChange={(e) => up("phone", e.target.value)} required /></Field>
            <Field label="Contact email" htmlFor="email" required><Input id="email" type="email" value={f.email} onChange={(e) => up("email", e.target.value)} required /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <UploadField kind="logo" label="Logo" value={logo} onChange={setLogo} />
              <div className="flex-1"><UploadField kind="cover" label="Cover photo" value={cover} onChange={setCover} aspect="wide" /></div>
            </div>
            <Field label="Tagline" htmlFor="tagline" hint="One line, up to 120 characters."><Input id="tagline" maxLength={120} value={f.tagline} onChange={(e) => up("tagline", e.target.value)} /></Field>
            <Field label="About your pharmacy" htmlFor="bio"><Textarea id="bio" rows={5} maxLength={2000} value={f.bio} onChange={(e) => up("bio", e.target.value)} /></Field>
            <ThemeColorPicker value={f.themeColor} onChange={(v) => up("themeColor", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Services & delivery</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {([["offersDelivery", "Prescription delivery"], ["offersTransfer", "Prescription transfers"], ["offersConsultation", "Pharmacist consultations"]] as const).map(([k, l]) => (
                <label key={k} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm"><span>{l}</span><Switch checked={f[k]} onCheckedChange={(v) => up(k, v)} /></label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery radius (km)" htmlFor="radius" hint="Informational for patients. The platform search radius is set by GetMed."><Input id="radius" type="number" min={0} max={200} step="0.5" value={f.deliveryRadiusKm} onChange={(e) => up("deliveryRadiusKm", e.target.value)} /></Field>
              <Field label="Typical delivery time" htmlFor="eta"><Input id="eta" placeholder="e.g. same day, 2–4 hours" value={f.estimatedDeliveryTime} onChange={(e) => up("estimatedDeliveryTime", e.target.value)} /></Field>
            </div>
            <Field label="Accepted insurance" htmlFor="ins"><TagInput value={f.acceptedInsurance} onChange={(v) => up("acceptedInsurance", v)} placeholder="Type and press Enter" suggestions={INSURERS} /></Field>
            <Field label="Accessibility notes" htmlFor="access" optional><Input id="access" value={f.accessibilityNotes} onChange={(e) => up("accessibilityNotes", e.target.value)} placeholder="Step-free entrance, parking, etc." /></Field>
            <div>
              <p className="text-sm font-medium text-ink-800">Consultation topics you offer</p>
              <p className="text-xs text-ink-500">Leave a price blank to charge no fee for that topic.</p>
              <div className="mt-2">
                <IssuePricingEditor
                  issues={data.issues}
                  selected={f.issueIds}
                  prices={f.issuePrices}
                  onSelectedChange={(v) => up("issueIds", v)}
                  onPricesChange={(v) => up("issuePrices", v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={pending} loadingText="Saving…" size="lg">Save changes</Button>
          {p.slug ? <Button asChild variant="link"><a href={`${patientUrl}/p/${p.slug}`} target="_blank" rel="noreferrer">View public page <ExternalLink /></a></Button> : null}
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Live preview</p>
        <PharmacyPreview
          d={{
            name: f.name, tagline: f.tagline, bio: f.bio, addressLine: f.addressLine, city: f.city, phone: f.phone, logoUrl: logo.url, coverUrl: cover.url,
            hours: p.hours, estimatedDeliveryTime: f.estimatedDeliveryTime, offersDelivery: f.offersDelivery, offersTransfer: f.offersTransfer, offersConsultation: f.offersConsultation,
            pharmacists: data.pharmacists.map((s) => ({ name: s.name, credentials: s.credentials ?? "", photoUrl: s.photoUrl, isMain: s.is_main })),
            services: data.services.map((s) => ({ name: s.name, price: s.price })), acceptedInsurance: f.acceptedInsurance,
          }}
        />
      </div>
    </div>
  );
}
