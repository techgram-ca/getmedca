"use client";

import { CalendarDays, Loader2, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "../lib/cn";

/**
 * Filter bar for a list page.
 *
 * Only the date window reaches the server: the page loads a few days of rows
 * and every other control narrows what is already in the browser, so a status
 * or search change is instant and costs nothing. There is no apply button —
 * changing a control is the action.
 */
export function TableFilters({
  from,
  to,
  onWindowChange,
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
  /** Fires only when the window changes — the one control that refetches. */
  onWindowChange: (from: string, to: string) => void;
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
  return (
    <div className={cn("surface mb-4 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4 shrink-0 text-brand-600" />
          <Input
            type="date"
            value={from}
            max={to}
            aria-label="From date"
            className="h-9 w-[9.5rem] text-sm"
            onChange={(e) => onWindowChange(e.target.value, to)}
          />
          <span className="text-sm text-ink-400">to</span>
          <Input
            type="date"
            value={to}
            min={from}
            aria-label="To date"
            className="h-9 w-[9.5rem] text-sm"
            onChange={(e) => onWindowChange(from, e.target.value)}
          />
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
        Change the dates to load a different period.
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
