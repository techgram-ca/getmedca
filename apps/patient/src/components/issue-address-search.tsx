"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete, Button, type AddressValue } from "@getmed/ui";

export function IssueAddressSearch({ slug, initial }: { slug: string; initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [picked, setPicked] = useState<AddressValue | null>(null);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const q = (picked?.full ?? text).trim();
        if (!q) return;
        const p = new URLSearchParams({ address: q });
        if (picked?.lat != null && picked?.lng != null) {
          p.set("lat", String(picked.lat));
          p.set("lng", String(picked.lng));
        }
        router.push(`/consultation/${slug}?${p}`);
      }}
    >
      <AddressAutocomplete value={text} onChange={(t) => { setText(t); setPicked(null); }} onSelect={setPicked} className="flex-1" />
      <Button type="submit"><Search /> Search</Button>
    </form>
  );
}
