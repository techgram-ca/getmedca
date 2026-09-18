"use client";

import { DAY_KEYS, DAY_LABELS, type WeeklyHours } from "@getmed/core/hours";
import { Input, Switch, cn } from "@getmed/ui";

export function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (v: WeeklyHours) => void }) {
  const set = (day: (typeof DAY_KEYS)[number], patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    const cur = value[day] ?? { open: "09:00", close: "18:00" };
    onChange({ ...value, [day]: { ...cur, ...patch } });
  };
  return (
    <div className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
      {DAY_KEYS.map((d) => {
        const h = value[d] ?? { open: "09:00", close: "18:00", closed: true };
        const closed = !!h.closed;
        return (
          <div key={d} className="grid grid-cols-[6rem_1fr] items-center gap-3 px-4 py-2.5 sm:grid-cols-[7rem_auto_1fr]">
            <span className="text-sm font-medium">{DAY_LABELS[d]}</span>
            <label className="flex items-center gap-2 text-xs text-ink-500">
              <Switch checked={!closed} onCheckedChange={(v) => set(d, { closed: !v })} aria-label={`${DAY_LABELS[d]} open`} /> {closed ? "Closed" : "Open"}
            </label>
            <div className={cn("col-span-2 flex items-center gap-2 sm:col-span-1", closed && "pointer-events-none opacity-40")}>
              <Input type="time" value={h.open} onChange={(e) => set(d, { open: e.target.value })} className="w-32" aria-label="Opens" />
              <span className="text-ink-400">to</span>
              <Input type="time" value={h.close} onChange={(e) => set(d, { close: e.target.value })} className="w-32" aria-label="Closes" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
