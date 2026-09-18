import * as React from "react";
import { cn } from "../lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-5 animate-spin text-brand-600", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-ink-200", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-1 text-ink-400 [&_svg]:size-8">{icon}</div> : null}
      <p className="font-medium text-ink-800">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "brand" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-white",
    brand: "bg-brand-600 text-white",
    warning: "bg-accent-100",
    danger: "bg-danger-100",
    success: "bg-success-100",
  } as const;
  return (
    <div className={cn("surface flex items-start justify-between gap-3 p-5", tones[tone], tone !== "neutral" && "border-transparent", className)}>
      <div>
        <p className={cn("text-xs font-medium uppercase tracking-wide", tone === "brand" ? "text-brand-100" : "text-ink-500")}>{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className={cn("mt-1 text-xs", tone === "brand" ? "text-brand-100" : "text-ink-500")}>{hint}</p> : null}
      </div>
      {icon ? <div className={cn("[&_svg]:size-5", tone === "brand" ? "text-brand-100" : "text-ink-400")}>{icon}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info-500/30 bg-info-100 text-blue-900",
    success: "border-success-500/30 bg-success-100 text-green-900",
    warning: "border-warning-500/30 bg-warning-100 text-amber-900",
    danger: "border-danger-500/30 bg-danger-100 text-red-900",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)} role={tone === "danger" ? "alert" : undefined}>
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}

export function Avatar({ src, name, className, size = 40 }: { src?: string | null; name: string; className?: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className={cn("rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <div
      className={cn("flex items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn("w-full text-sm", className)} {...props} />
  </div>
);
export const THead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("text-left text-xs uppercase tracking-wide text-ink-500", className)} {...props} />
);
export const TBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-ink-100", className)} {...props} />
);
export const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-soft hover:bg-ink-50", className)} {...props} />
);
export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("px-4 py-3 font-medium", className)} {...props} />
);
export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...props} />
);
