"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete, Button, type AddressValue } from "@getmed/ui";

export function IssueAddressSearch({ slug, initial }: { slug: string; initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [picked, setPicked] = useState<AddressValue | null>(null);
  const [busy, setBusy] = useState(false);

  function go(selected?: AddressValue | null) {
    const chosen = selected ?? picked;
    const query = (chosen?.full ?? text).trim();
    if (!query) {
      document.getElementById("issue-address")?.focus();
      return;
    }
    setBusy(true);
    const p = new URLSearchParams({ address: query });
    if (chosen?.lat != null && chosen?.lng != null) {
      p.set("lat", String(chosen.lat));
      p.set("lng", String(chosen.lng));
    }
    router.push(`/consultation/${slug}?${p}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <label htmlFor="issue-address" className="mb-2 block text-sm font-semibold text-ink-800">Your address</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <AddressAutocomplete
          id="issue-address"
          value={text}
          onChange={(t) => {
            setText(t);
            setPicked(null);
          }}
          onSelect={(a) => {
            setPicked(a);
            go(a);
          }}
          placeholder="Street address or postal code"
          className="flex-1"
          autoFocus={!initial}
        />
        <Button type="submit" size="lg" loading={busy} loadingText="Searching…" className="shrink-0">
          <Search /> Find pharmacists
        </Button>
      </div>
    </form>
  );
}
