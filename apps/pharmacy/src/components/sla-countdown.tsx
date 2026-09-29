"use client";

import { useEffect, useState } from "react";
import { cn } from "@getmed/ui";

/**
 * Live countdown to the order's response deadline.
 *
 * `minutes` is required rather than defaulted: the window is the admin's to
 * set, and a default here is how the countdown came to show a fixed 30 minutes
 * regardless of it. Callers pass the order's own snapshotted window.
 */
export function SlaCountdown({ since, minutes }: { since: string; minutes: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, new Date(since).getTime() + minutes * 60000 - now);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 5 * 60000;
  return (
    <div className={cn("rounded-lg px-3 py-1.5 text-center tabular-nums", urgent ? "bg-danger-100 text-red-800" : "bg-accent-100 text-accent-800")}>
      <p className="text-lg font-semibold leading-tight">{remaining === 0 ? "0:00" : `${m}:${String(s).padStart(2, "0")}`}</p>
      <p className="text-[10px] uppercase tracking-wide">to respond</p>
    </div>
  );
}
