import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, cn } from "@getmed/ui";

export type OrderingPharmacy = { id: string; slug: string; name: string; logoUrl: string | null };

/**
 * In-page reminder of which pharmacy an order belongs to.
 *
 * The order flow itself is GetMed-branded (GetMed handles verification,
 * delivery and support), so the pharmacy appears as context here rather than
 * in the page header.
 */
export function OrderingFrom({
  pharmacy,
  label = "Ordering from",
  className,
  showBack = true,
}: {
  pharmacy: OrderingPharmacy;
  label?: string;
  className?: string;
  showBack?: boolean;
}) {
  return (
    <div className={cn("surface flex flex-wrap items-center gap-4 rounded-2xl p-4", className)}>
      <Avatar src={pharmacy.logoUrl} name={pharmacy.name} size={48} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className="truncate font-bold text-ink-950">{pharmacy.name}</p>
      </div>
      {showBack ? (
        <Link
          href={`/p/${pharmacy.slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 no-underline hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to pharmacy
        </Link>
      ) : null}
    </div>
  );
}
