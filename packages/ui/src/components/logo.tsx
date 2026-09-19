import * as React from "react";
import { cn } from "../lib/cn";

/** Served from every app's own `public/images/logo.png`. */
const LOGO_SRC = "/images/logo.png";

const SIZES = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
} as const;

/**
 * The GetMed wordmark.
 *
 * On dark surfaces pass `light`: the wordmark's teal half would otherwise sink
 * into the background, so it is placed on a white plate to keep the brand
 * colours intact and legible.
 */
export function Logo({
  className,
  light = false,
  size = "md",
}: {
  className?: string;
  /** @deprecated The mark is a wordmark; this prop is ignored. */
  wordmark?: boolean;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO_SRC} alt="GetMed" className={cn(SIZES[size], "w-auto select-none")} decoding="async" />
  );

  if (light) {
    return (
      <span className={cn("inline-flex items-center rounded-xl bg-white px-2.5 py-1.5", className)}>
        {img}
      </span>
    );
  }
  return <span className={cn("inline-flex items-center", className)}>{img}</span>;
}

/** Small "Powered by GetMed" mark for pharmacy-owned pages. */
export function PoweredByGetMed({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[0.65rem] font-medium whitespace-nowrap", light ? "text-white/70" : "text-ink-400", className)}>
      Powered by
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="GetMed" className={cn("h-3.5 w-auto select-none", light && "brightness-0 invert")} decoding="async" />
    </span>
  );
}
