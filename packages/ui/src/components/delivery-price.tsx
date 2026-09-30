import { cn } from "../lib/cn";
import { Badge } from "./badge";

export type DeliveryPriceView = {
  /** True when this is a remote delivery, priced from its distance. */
  remote?: boolean;
  /** Final price, once there is one. */
  fee: string | null;
  /** How far the driver goes — worth seeing when the distance set the price. */
  distance?: string | null;
  /**
   * A range quoted under the old rule, where a remote delivery waited on an
   * admin. Nothing produces one now; orders from before that change still
   * carry theirs, and showing it beats showing nothing.
   */
  quote?: { min: string; max: string } | null;
};

/**
 * What a delivery costs the pharmacy, shown on its own orders.
 *
 * A price and, for a remote delivery, the distance that produced it. Which of
 * the four fixed zones an address falls in is how the price is worked out, not
 * a thing the pharmacy decides or can change, and putting a zone number under
 * every figure only raised questions with no useful answer.
 */
export function DeliveryPrice({ price, className }: { price: DeliveryPriceView; className?: string }) {
  if (!price.fee && !price.quote) {
    return <span className={cn("text-ink-500", className)}>Being priced…</span>;
  }
  return (
    <span className={cn("block", className)}>
      {price.fee ? (
        <span className="font-semibold text-ink-950">{price.fee}</span>
      ) : (
        <>
          <span className="font-semibold text-ink-950">
            {price.quote!.min} – {price.quote!.max}
          </span>
          <span className="ml-1.5 text-xs text-ink-500">estimated</span>
        </>
      )}
      {price.remote ? (
        <span className="ml-1.5 inline-flex items-center gap-1.5 align-middle">
          <Badge tone="accent">Remote</Badge>
          {price.distance ? <span className="text-xs text-ink-500">{price.distance}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
