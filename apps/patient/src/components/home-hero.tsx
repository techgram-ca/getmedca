"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete, Button, ImageWithFallback, type AddressValue } from "@getmed/ui";

export function HomeHero() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [place, setPlace] = useState<AddressValue | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") === "address") {
      params.delete("focus");
      const clean = params.toString();
      window.history.replaceState({}, "", clean ? `/?${clean}` : "/");
      setTimeout(() => document.getElementById("hero-address-input")?.focus(), 80);
    }
  }, []);

  function search() {
    const query = (place?.full ?? text).trim();
    if (!query) {
      document.getElementById("hero-address-input")?.focus();
      return;
    }
    setSearching(true);
    const params = new URLSearchParams({ address: query });
    if (place?.lat != null && place?.lng != null) {
      params.set("lat", String(place.lat));
      params.set("lng", String(place.lng));
    }
    router.push(`/search?${params}`);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-14">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
            <span className="pulse-dot size-2 rounded-full bg-brand-600" />
            Licensed Ontario pharmacies
          </div>

          <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold leading-[1.15] tracking-tight">
            Get Your <span className="text-brand-600">Medicines</span> Delivered
          </h1>

          <p className="mt-4 max-w-[500px] text-[1.1rem] leading-[1.7] text-ink-500">
            Quickly order prescription medicines from nearby pharmacies and get them delivered straight to your door — safe, fast, and hassle-free.
          </p>

          <form
            className="mt-8 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <AddressAutocomplete
              id="hero-address-input"
              value={text}
              onChange={(t) => {
                setText(t);
                setPlace(null);
              }}
              onSelect={setPlace}
              placeholder="Enter your address or postal code"
              className="min-w-[240px] flex-1"
              name="address"
            />
            <Button type="submit" size="lg" loading={searching} loadingText="Searching…">
              <Search /> Find Pharmacies
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-3 text-xs text-ink-500">
            <div className="flex">
              {[1, 2, 3, 4].map((n, i) => (
                <ImageWithFallback
                  key={n}
                  src={`/images/user-${n}.jpg`}
                  alt=""
                  wrapperClassName={`size-7 shrink-0 rounded-full border-2 border-white${i === 0 ? "" : " -ml-1.5"}`}
                />
              ))}
            </div>
            <span>Join thousands getting medicines delivered daily</span>
          </div>
        </div>

        <div className="hero-plate hidden lg:block">
          <ImageWithFallback
            src="/images/hero.png"
            alt="Medicine delivery"
            label="Upload /images/hero.png"
            wrapperClassName="relative aspect-[4/3] w-full rounded-2xl shadow-hero"
          />
        </div>
      </div>
    </div>
  );
}
