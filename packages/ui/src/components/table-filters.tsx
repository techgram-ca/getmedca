"use client";

import * as React from "react";
import { CalendarDays, Check, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "../lib/cn";

/**
 * Filter bar for a list page.
 *
 * Only the date window reaches the server: the page loads a few days of rows
 * and every other control narrows what is already in the browser, so a status
 * or search change is instant and costs nothing. Those have no apply button —
 * changing the control is the action.
 *
 * The dates are the exception. A native date picker fires a change event for
 * every intermediate value it produces, so binding it straight to a refetch
 * loads data for a month the person was only scrolling past, or for a stray
 * click on a leading day of the previous month. The fields hold a draft and
 * commit on Enter, on leaving the field, or on Apply — which appears only
 * while a date is unapplied.
 */
export function TableFilters({
  from,
  to,
  onWindowChange,
  onRefresh,
  today,
  onTodayChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  onReset,
  loading,
  showing,
  total,
  noun = "rows",
  children,
  className,
}: {
  from: string;
  to: string;
  /** Fires only when the window is committed — the one control that refetches. */
  onWindowChange: (from: string, to: string) => void;
  /** Reloads the current window from the server. */
  onRefresh?: () => void;
  today: boolean;
  onTodayChange: (on: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onReset: () => void;
  loading?: boolean;
  showing: number;
  total: number;
  noun?: string;
  /** The selects for this page, narrowing in the browser. */
  children?: React.ReactNode;
  className?: string;
}) {
  const [draft, setDraft] = React.useState({ from, to });
  const [applied, setApplied] = React.useState({ from, to });

  // The window changed elsewhere (Reset, the back button, a fresh load), so the
  // draft follows it. Adjusting during render rather than in an effect keeps the
  // fields from flashing the previous dates first.
  if (applied.from !== from || applied.to !== to) {
    setApplied({ from, to });
    setDraft({ from, to });
  }

  const dirty = draft.from !== from || draft.to !== to;
  const commit = () => {
    if (!dirty || !draft.from || !draft.to) return;
    onWindowChange(draft.from, draft.to);
  };

  return (
    <div className={cn("surface mb-4 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4 shrink-0 text-brand-600" />
          <Input
            type="date"
            value={draft.from}
            max={draft.to}
            aria-label="From date"
            className="h-9 w-[9.5rem] text-sm"
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
          />
          <span className="text-sm text-ink-400">to</span>
          <Input
            type="date"
            value={draft.to}
            min={draft.from}
            aria-label="To date"
            className="h-9 w-[9.5rem] text-sm"
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
          />
          {dirty ? (
            <Button type="button" size="sm" onClick={commit}>
              <Check /> Apply
            </Button>
          ) : null}
          {loading ? <Loader2 className="size-4 animate-spin text-brand-600" aria-label="Loading" /> : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant={today ? "primary" : "outline"}
          aria-pressed={today}
          onClick={() => onTodayChange(!today)}
        >
          Today
        </Button>

        {children}

        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 min-w-48 flex-1 text-sm"
        />

        {onRefresh ? (
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn(loading && "animate-spin")} /> Refresh
          </Button>
        ) : null}

        <Button type="button" size="sm" variant="ghost" onClick={onReset}>
          <RotateCcw /> Reset
        </Button>
      </div>

      <p className="mt-2 text-xs text-ink-500">
        {showing === total ? (
          <>
            {total} {noun} loaded
          </>
        ) : (
          <>
            Showing <span className="font-semibold text-ink-950">{showing}</span> of {total} {noun} loaded
          </>
        )}
        {" · "}
        {dirty ? "Press Apply or Enter to load the new dates." : "Change the dates to load a different period."}
      </p>
    </div>
  );
}

/** A compact select for the filter bar, so every page's controls line up. */
export function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 cursor-pointer rounded-full border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition-soft focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
    >
      {children}
    </select>
  );
}
