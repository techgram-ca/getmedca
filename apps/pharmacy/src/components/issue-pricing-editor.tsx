"use client";

import { Checkbox, Input } from "@getmed/ui";

type Issue = { id: string; name: string };

/**
 * Consultation topics a pharmacy offers, each with what it charges. A blank
 * price means no fee, which is how every topic behaved before prices existed —
 * so leaving the column empty keeps the old behaviour.
 */
export function IssuePricingEditor({
  issues,
  selected,
  prices,
  onSelectedChange,
  onPricesChange,
}: {
  issues: Issue[];
  selected: string[];
  prices: Record<string, string>;
  onSelectedChange: (ids: string[]) => void;
  onPricesChange: (prices: Record<string, string>) => void;
}) {
  if (issues.length === 0) return <p className="text-sm text-ink-500">No consultation topics are set up yet.</p>;

  const toggle = (id: string, on: boolean) => onSelectedChange(on ? [...selected, id] : selected.filter((x) => x !== id));

  return (
    <div className="divide-y divide-ink-200 overflow-hidden rounded-xl border border-ink-200">
      {issues.map((issue) => {
        const on = selected.includes(issue.id);
        return (
          <div key={issue.id} className="flex items-center gap-3 px-3 py-2.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={on} onCheckedChange={(v) => toggle(issue.id, !!v)} />
              <span className="truncate">{issue.name}</span>
            </label>
            {on ? (
              <div className="relative w-28 shrink-0">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 pl-6 text-sm"
                  placeholder="No fee"
                  aria-label={`Price for ${issue.name}`}
                  value={prices[issue.id] ?? ""}
                  onChange={(e) => onPricesChange({ ...prices, [issue.id]: e.target.value })}
                />
              </div>
            ) : (
              <span className="w-28 shrink-0 text-right text-xs text-ink-400">Not offered</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
