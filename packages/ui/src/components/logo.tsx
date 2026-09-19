import * as React from "react";
import { HeartPulse } from "lucide-react";
import { cn } from "../lib/cn";

export function Logo({
  className,
  wordmark = true,
  light = false,
  size = "md",
}: {
  className?: string;
  wordmark?: boolean;
  light?: boolean;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-7 rounded-lg" : "size-9 rounded-[10px]";
  const icon = size === "sm" ? "size-3.5" : "size-5";
  const text = size === "sm" ? "text-sm" : "text-[1.2rem]";
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-extrabold tracking-tight", light ? "text-white" : "text-ink-950", className)}>
      <span className={cn("flex items-center justify-center", box, light ? "bg-white/15" : "bg-brand-600")} aria-hidden>
        <HeartPulse className={cn(icon, "text-white")} />
      </span>
      {wordmark ? (
        <span className={text}>
          Get<span className={light ? "text-brand-200" : "text-brand-600"}>Med</span>
        </span>
      ) : null}
    </span>
  );
}

/** Small "Powered by GetMed" mark for pharmacy-owned pages. */
export function PoweredByGetMed({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.65rem] font-medium whitespace-nowrap", light ? "text-white/70" : "text-ink-400", className)}>
      Powered by
      <span className={cn("inline-flex items-center gap-0.5 font-bold", light ? "text-white" : "text-ink-700")}>
        <HeartPulse className={cn("size-3", light ? "text-brand-200" : "text-brand-600")} aria-hidden />
        Get<span className="text-brand-600">Med</span>
      </span>
    </span>
  );
}
