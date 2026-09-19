"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * Image that degrades to a branded placeholder when the file is missing or
 * fails to load, so layouts stay intact before artwork is uploaded.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  wrapperClassName,
  label,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  label?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const show = !!src && !failed;
  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={alt} onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-100 via-brand-50 to-white text-brand-600",
            className,
          )}
          role="img"
          aria-label={alt}
        >
          <ImageIcon className="size-8 opacity-50" aria-hidden />
          {label ? <span className="px-4 text-center text-xs font-medium opacity-70">{label}</span> : null}
        </div>
      )}
    </div>
  );
}
