"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { AddressAutocomplete, Button, type AddressValue } from "@getmed/ui";

/** Progressive CTA: a single button that expands into the address search. */
export function ConsultAddressSearch({ slug }: { slug?: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!!slug);
  const [text, setText] = useState("");
  const [place, setPlace] = useState<AddressValue | null>(null);
  const [busy, setBusy] = useState(false);

  function go(selected?: AddressValue | null) {
    const chosen = selected ?? place;
    const query = (chosen?.full ?? text).trim();
    if (!query) {
      document.getElementById("consult-address")?.focus();
      return;
    }
    setBusy(true);
    const params = new URLSearchParams({ address: query });
    if (chosen?.lat != null && chosen?.lng != null) {
      params.set("lat", String(chosen.lat));
      params.set("lng", String(chosen.lng));
    }
    router.push(slug ? `/consultation/${slug}?${params}` : `/search?${params}`);
  }

  if (!expanded) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button size="lg" onClick={() => setExpanded(true)}>
          Start Consultation <ArrowRight />
        </Button>
        <p className="text-xs text-ink-500">Takes less than 2 minutes</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <AddressAutocomplete
        id="consult-address"
        value={text}
        onChange={(t) => {
          setText(t);
          setPlace(null);
        }}
        onSelect={(a) => {
          setPlace(a);
          go(a);
        }}
        placeholder="Enter your address…"
        className="min-w-[220px] flex-1"
        autoFocus
      />
      <Button type="submit" size="lg" loading={busy} loadingText="Searching…" className="shrink-0">
        <Search /> Find Pharmacists
      </Button>
    </form>
  );
}
