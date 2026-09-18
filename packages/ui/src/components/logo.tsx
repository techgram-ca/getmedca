import * as React from "react";
import { cn } from "../lib/cn";

export function Logo({ className, wordmark = true, light = false }: { className?: string; wordmark?: boolean; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", light ? "text-white" : "text-ink-950", className)}>
      <span className={cn("flex size-8 items-center justify-center rounded-lg", light ? "bg-white/15" : "bg-brand-600")} aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16M4 12h16" />
          <circle cx="12" cy="12" r="9" className="opacity-40" />
        </svg>
      </span>
      {wordmark ? (
        <span className="text-lg">
          Get<span className={light ? "text-brand-200" : "text-brand-600"}>Med</span>
        </span>
      ) : null}
    </span>
  );
}
