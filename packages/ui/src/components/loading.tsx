import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <Loader2 className={cn("size-5 animate-spin text-brand-600", className)} aria-hidden />
      {label ? <span className="text-sm text-ink-500">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-ink-100", className)}
      {...props}
      aria-hidden
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

/** Centred spinner for route-level loading.tsx files. */
export function PageLoader({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] w-full flex-col items-center justify-center gap-3", className)}>
      <Loader2 className="size-8 animate-spin text-brand-600" aria-hidden />
      <p className="text-sm text-ink-500" role="status">{label}</p>
    </div>
  );
}

/** Dims a section while a background action runs, with a visible message. */
export function LoadingOverlay({ show, label = "Working…" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/75 backdrop-blur-[1px] animate-fade-in" role="status" aria-live="polite">
      <span className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2 shadow-pop">
        <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
        <span className="text-sm font-medium text-ink-800">{label}</span>
      </span>
    </div>
  );
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface flex items-center gap-4 p-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
