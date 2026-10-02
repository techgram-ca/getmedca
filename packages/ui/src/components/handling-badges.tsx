import { Banknote, Pill, Snowflake } from "lucide-react";
import { cn } from "../lib/cn";

export type Handling = {
  requiresRefrigeration: boolean;
  hasNarcotics: boolean;
  /** Null when nothing is collected at the door. */
  cashToCollect: string | null;
};

/**
 * How a delivery has to be handled, for whoever is about to carry it.
 *
 * Loud on purpose. A driver who misses "keep this cold" ruins the medication,
 * and one who misses "collect $40" finishes the round without the money. These
 * sit above the address rather than among the notes for that reason.
 *
 * Renders nothing when there is nothing to say, so an ordinary delivery is not
 * given a row of reassuring empty badges to read past.
 */
export function HandlingBadges({ handling, className }: { handling: Handling; className?: string }) {
  const { requiresRefrigeration, hasNarcotics, cashToCollect } = handling;
  if (!requiresRefrigeration && !hasNarcotics && !cashToCollect) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {requiresRefrigeration ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-100 px-3 py-1 text-xs font-semibold text-blue-900">
          <Snowflake className="size-3.5" /> Keep refrigerated
        </span>
      ) : null}
      {hasNarcotics ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-100 px-3 py-1 text-xs font-semibold text-amber-900">
          <Pill className="size-3.5" /> Controlled substance — ID required
        </span>
      ) : null}
      {cashToCollect ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1 text-xs font-semibold text-green-900">
          <Banknote className="size-3.5" /> Collect {cashToCollect}
        </span>
      ) : null}
    </div>
  );
}
