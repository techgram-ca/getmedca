"use client";

import * as React from "react";
import { SearchBoxCore, SessionToken, type SearchBoxSuggestion } from "@mapbox/search-js-core";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import { useDebounce } from "../lib/use-debounce";

export type AddressValue = {
  line: string;
  city?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  full?: string;
};

/** Ontario bounding box — every autocomplete on the platform is restricted to it. */
const ONTARIO_BBOX: [number, number, number, number] = [-95.16, 41.66, -74.32, 56.86];

let core: SearchBoxCore | null = null;
function getCore() {
  if (!core) {
    core = new SearchBoxCore({
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
      country: "CA",
      bbox: ONTARIO_BBOX,
      language: "en",
      types: "address,street,postcode,place",
      limit: 6,
    });
  }
  return core;
}

export type AddressAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (value: AddressValue) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  size?: "md" | "lg";
  name?: string;
};

/**
 * THE shared address autocomplete (spec §5). Uses the Mapbox Search JS SDK's
 * SearchBoxCore with its built-in SessionToken handling so suggest+retrieve are
 * billed per session, not per keystroke. Debounced, keyboard-navigable.
 * Reused on: home search bar, order delivery address, pharmacy signup address.
 */
export function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Enter your address or postal code",
  className,
  inputClassName,
  invalid,
  autoFocus,
  size = "md",
  name,
}: AddressAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<SearchBoxSuggestion[]>([]);
  const [active, setActive] = React.useState(-1);
  const session = React.useRef<SessionToken>(new SessionToken());
  const skipNext = React.useRef(false);
  const debounced = useDebounce(value, 280);
  const listId = React.useId();

  React.useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = debounced.trim();
    if (q.length < 3 || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCore()
      .suggest(q, { sessionToken: session.current })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.suggestions);
        setOpen(true);
        setActive(-1);
      })
      .catch(() => !cancelled && setSuggestions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const pick = async (s: SearchBoxSuggestion) => {
    setOpen(false);
    setLoading(true);
    try {
      const res = await getCore().retrieve(s, { sessionToken: session.current });
      const f = res.features[0];
      const props = f?.properties;
      const ctx = props?.context;
      const line = props?.address ?? props?.name ?? s.name;
      const full = props?.full_address ?? s.full_address ?? line;
      skipNext.current = true;
      onChange(full);
      onSelect({
        line,
        city: ctx?.place?.name ?? null,
        postalCode: ctx?.postcode?.name ?? null,
        lat: f?.geometry.coordinates[1] ?? null,
        lng: f?.geometry.coordinates[0] ?? null,
        full,
      });
      // A new session starts after each retrieve (SDK billing model).
      session.current = new SessionToken();
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void pick(suggestions[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <MapPin className={cn("pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ink-500", size === "lg" ? "size-5" : "size-4")} />
      <input
        id={id}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full rounded-2xl border bg-white text-ink-900 outline-none placeholder:text-ink-400 transition-soft focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12",
          size === "lg" ? "h-14 pl-12 pr-11 text-base" : "h-12 pl-11 pr-10 text-sm",
          invalid ? "border-danger-500 bg-red-50/40" : "border-ink-200",
          inputClassName,
        )}
      />
      {loading ? <Loader2 className="absolute right-4 top-1/2 z-10 size-4 -translate-y-1/2 animate-spin text-brand-600" aria-hidden /> : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white py-1 shadow-pop animate-fade-in"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.mapbox_id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                void pick(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-start gap-2.5 px-4 py-2.5 text-sm", i === active ? "bg-brand-50 text-brand-900" : "text-ink-800")}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink-900">{s.name}</span>
                {s.place_formatted ? <span className="block truncate text-xs text-ink-500">{s.place_formatted}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
