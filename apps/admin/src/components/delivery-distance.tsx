"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, MapPin, RefreshCw, Route } from "lucide-react";
import { formatDistance, formatDuration } from "@getmed/core/format";
import { Badge, Button, Spinner, cn } from "@getmed/ui";
import { ensureOrderRouteAction } from "@/lib/actions/orders";

export type StoredRoute = {
  distanceM: number | null;
  durationS: number | null;
  avoidsTolls: boolean | null;
};

/**
 * Driving distance from the pharmacy to the patient, stored on the order.
 *
 * Orders created before this existed have no stored route, so the first view
 * computes and saves it once; after that the value is simply read back.
 */
export function DeliveryDistance({
  orderId,
  route,
  address,
  className,
}: {
  orderId: string;
  route: StoredRoute;
  address: string | null;
  className?: string;
}) {
  const [current, setCurrent] = useState(route);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const attempted = useRef(current.distanceM != null);

  const compute = (force = false) =>
    start(async () => {
      setError(null);
      const r = await ensureOrderRouteAction(orderId, force);
      if (r.ok) setCurrent({ distanceM: r.distanceM, durationS: r.durationS, avoidsTolls: r.avoidsTolls });
      else setError(r.error);
    });

  // Backfill exactly once for orders that predate stored routes.
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    compute(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("rounded-2xl border border-ink-200 bg-ink-50 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <Route className="size-3.5" /> Driving distance
          </p>

          {current.distanceM != null ? (
            <>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">
                {formatDistance(current.distanceM)}
                {current.durationS != null ? (
                  <span className="ml-2 text-sm font-medium text-ink-500">· {formatDuration(current.durationS)} drive</span>
                ) : null}
              </p>
              <div className="mt-1.5">
                {current.avoidsTolls === false ? (
                  <Badge tone="warning"><AlertTriangle className="size-3" /> Uses a toll road — no toll-free route exists</Badge>
                ) : (
                  <Badge tone="success">Toll-free route</Badge>
                )}
              </div>
            </>
          ) : pending ? (
            <p className="mt-2"><Spinner label="Working out the distance…" /></p>
          ) : (
            <p className="mt-1 text-sm text-ink-500">{error ?? "Not calculated yet."}</p>
          )}

          {address ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span>{address}</span>
            </p>
          ) : null}
        </div>

        <Button size="sm" variant="outline" loading={pending} loadingText="Calculating…" onClick={() => compute(true)} className="shrink-0">
          <RefreshCw /> {current.distanceM != null ? "Recalculate" : "Calculate"}
        </Button>
      </div>

      {error && current.distanceM != null ? <p className="mt-2 text-sm text-danger-500">{error}</p> : null}
    </div>
  );
}
