import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-ink-100 text-ink-700",
      brand: "bg-brand-100 text-brand-800",
      success: "bg-success-100 text-green-800",
      warning: "bg-warning-100 text-amber-800",
      danger: "bg-danger-100 text-red-800",
      info: "bg-info-100 text-blue-800",
      accent: "bg-accent-100 text-accent-800",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONES: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  pending: "warning",
  accepted: "info",
  ready_for_delivery: "brand",
  assigned: "brand",
  picked_up: "brand",
  delivered: "success",
  failed: "danger",
  rejected: "danger",
  cancelled: "danger",
  timed_out: "danger",
  new: "warning",
  contacted: "info",
  resolved: "success",
  approved: "success",
  inactive: "neutral",
  open: "warning",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  ready_for_delivery: "Ready for delivery",
  assigned: "Driver assigned",
  picked_up: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  timed_out: "Timed out",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={cn("capitalize", className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
