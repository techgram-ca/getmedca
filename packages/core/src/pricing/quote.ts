import type { ServiceClient } from "@getmed/db/service";
import { drivingRoute } from "../geo/mapbox";
import { loadPricingContext, resolveZone } from "./index";
import { REMOTE_ZONE, toFsa, type FixedZone, type RemoteQuote } from "./zones";

export type AddressQuote =
  | { kind: "tagged"; zone: FixedZone; price: number }
  | { kind: "remote"; zone: typeof REMOTE_ZONE; quote: RemoteQuote; distanceM: number }
  | { kind: "unknown" };

/**
 * What a delivery to an address will cost this pharmacy, worked out before any
 * order exists — for the manual order form, so a pharmacy sees the price as it
 * types rather than after the fact.
 *
 * A tagged postal code answers instantly from the pharmacy's own zones. Only an
 * untagged one needs a route, and that is one Mapbox call per address actually
 * chosen, not per keystroke. The same rules the real pricing uses, so what the
 * form shows is what the order will be charged.
 */
export async function quoteAddress(
  db: ServiceClient,
  pharmacyId: string,
  address: { postalCode: string | null; lat: number | null; lng: number | null },
): Promise<AddressQuote> {
  const ctx = await loadPricingContext(db, pharmacyId);

  // Settled without a route, and without spending a Mapbox request.
  const fsa = toFsa(address.postalCode);
  const tagged = fsa ? ctx.taggedZones.get(fsa) : undefined;
  if (tagged) return { kind: "tagged", zone: tagged, price: ctx.pricing[tagged].price };

  if (address.lat == null || address.lng == null) return { kind: "unknown" };

  const { data: points } = await db.rpc("pharmacy_point", { p_pharmacy_id: pharmacyId });
  const from = points?.[0];
  if (!from) return { kind: "unknown" };

  const route = await drivingRoute({ lat: from.lat, lng: from.lng }, { lat: address.lat, lng: address.lng });
  if (!route) return { kind: "unknown" };

  const distanceM = Math.round(route.distanceM * 10) / 10;
  const resolution = resolveZone(ctx, { delivery_postal_code: address.postalCode, delivery_distance_m: distanceM });
  if (resolution.source !== "remote") return { kind: "unknown" };
  return { kind: "remote", zone: REMOTE_ZONE, quote: resolution.quote, distanceM };
}
