import { cn } from "../lib/cn";

export type DeliveryPriceView = {
  zoneLabel: string | null;
  /** Final price, once there is one. */
  fee: string | null;
  /** Quoted range, shown while a remote delivery is awaiting confirmation. */
  quote: { min: string; max: string } | null;
};

/**
 * What a delivery costs the pharmacy, shown on its own orders.
 *
 * A quoted range appears only for a remote delivery that GetMed has not
 * confirmed a price for yet. The final charge can never exceed the top of that
 * range, which is what makes it safe to accept an order on it.
 */
export function DeliveryPrice({ price, className }: { price: DeliveryPriceView; className?: string }) {
  if (!price.zoneLabel && !price.fee && !price.quote) {
    return <span className={cn("text-ink-500", className)}>Being priced…</span>;
  }
  return (
    <span className={cn("block", className)}>
      {price.fee ? (
        <span className="font-semibold text-ink-950">{price.fee}</span>
      ) : price.quote ? (
        <>
          <span className="font-semibold text-ink-950">
            {price.quote.min} – {price.quote.max}
          </span>
          <span className="ml-1.5 text-xs text-ink-500">estimated</span>
        </>
      ) : (
        <span className="text-ink-500">Being priced…</span>
      )}
      {price.zoneLabel ? <span className="block text-xs text-ink-500">{price.zoneLabel}</span> : null}
    </span>
  );
}
