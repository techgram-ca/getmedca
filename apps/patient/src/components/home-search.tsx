"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete, Button, type AddressValue } from "@getmed/ui";

export function HomeSearch({ className, size = "lg" }: { className?: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<AddressValue | null>(null);

  const go = () => {
    const q = (picked?.full ?? text).trim();
    if (!q) return;
    const params = new URLSearchParams({ address: q });
    if (picked?.lat != null && picked?.lng != null) {
      params.set("lat", String(picked.lat));
      params.set("lng", String(picked.lng));
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      id="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <AddressAutocomplete
          id="home-address"
          size={size}
          value={text}
          onChange={(t) => {
            setText(t);
            setPicked(null);
          }}
          onSelect={setPicked}
          placeholder="Enter your delivery address or postal code"
          className="flex-1"
          name="address"
        />
        <Button type="submit" size={size} className="sm:w-auto">
          <Search /> Find pharmacies
        </Button>
      </div>
    </form>
  );
}
