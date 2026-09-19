"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete, Button, type AddressValue } from "@getmed/ui";

/** Compact address search reused on secondary pages. */
export function HomeSearchInline({ className }: { className?: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [place, setPlace] = useState<AddressValue | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const query = (place?.full ?? text).trim();
        if (!query) return;
        setBusy(true);
        const params = new URLSearchParams({ address: query });
        if (place?.lat != null && place?.lng != null) {
          params.set("lat", String(place.lat));
          params.set("lng", String(place.lng));
        }
        router.push(`/search?${params}`);
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <AddressAutocomplete
          value={text}
          onChange={(t) => {
            setText(t);
            setPlace(null);
          }}
          onSelect={setPlace}
          placeholder="Enter your delivery address or postal code"
          className="flex-1"
        />
        <Button type="submit" loading={busy} loadingText="Searching…" className="sm:w-auto">
          <Search /> Find pharmacies
        </Button>
      </div>
    </form>
  );
}
