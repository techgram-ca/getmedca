"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { AddressAutocomplete, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Textarea, toast } from "@getmed/ui";
import { DEFAULT_THEME_COLOR } from "@getmed/core/theme";
import { saveProfile } from "@/lib/actions/profile";
import type { ProfileData } from "@/lib/load-profile";
import { ThemeColorPicker } from "./theme-color-picker";
import { UploadField } from "./upload-field";

/**
 * Business details and branding.
 *
 * What used to sit under "Services & delivery" is gone: the three service
 * switches, the delivery radius, the typical delivery time, accepted insurance
 * and accessibility notes. Delivery and transfers are what every pharmacy on
 * GetMed does, so a switch to turn them off was a way to quietly break a
 * listing; the radius was labelled informational and the rest was asked of
 * every pharmacy and filled in by almost none. Consultation topics moved to
 * the Pharmacists tab, next to the people who answer them. The columns are
 * still in the database and still read by the public page; saving now only
 * re-asserts that delivery and transfers are on.
 *
 * The live preview is gone too. It was a second, slightly wrong rendering of
 * the public page that had to be kept in step with the real one by hand; the
 * real page is one click away below.
 */
export function ProfileForm({ data, patientUrl }: { data: ProfileData; patientUrl: string }) {
  const p = data.pharmacy;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: p.name ?? "", phone: p.phone ?? "", email: p.email ?? "", addressLine: p.address_line ?? "", city: p.city ?? "", postalCode: p.postal_code ?? "",
    lat: null as number | null, lng: null as number | null, tagline: p.tagline ?? "", bio: p.bio ?? "",
    themeColor: p.theme_color ?? DEFAULT_THEME_COLOR,
  });
  const [addressText, setAddressText] = useState([p.address_line, p.city, p.postal_code].filter(Boolean).join(", "));
  const [logo, setLogo] = useState({ path: p.logo_path, url: p.logoUrl });
  const [cover, setCover] = useState({ path: p.cover_path, url: p.coverUrl });
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = () =>
    start(async () => {
      const r = await saveProfile({ ...f, logoPath: logo.path, coverPath: cover.path });
      if (r.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <form className="max-w-3xl space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
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

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Saving…" size="lg">Save changes</Button>
        {p.slug ? <Button asChild variant="link"><a href={`${patientUrl}/p/${p.slug}`} target="_blank" rel="noreferrer">View public page <ExternalLink /></a></Button> : null}
      </div>
    </form>
  );
}
