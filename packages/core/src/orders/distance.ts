import type { ServiceClient } from "@getmed/db/service";
import { drivingRoute } from "../geo/mapbox";

export type StoredRoute = {
  distanceM: number | null;
  durationS: number | null;
  avoidsTolls: boolean | null;
  computedAt: string | null;
};

/**
 * Computes the pharmacy-to-patient driving distance once and stores it on the
 * order. Later calls return the stored value, so the number an admin sees
 * while choosing a delivery type never shifts and we do not pay to re-route.
 */
export async function ensureOrderRoute(db: ServiceClient, orderId: string, force = false): Promise<StoredRoute | null> {
  const { data: order } = await db
    .from("orders")
    .select("id, pharmacy_id, delivery_distance_m, delivery_duration_s, delivery_route_avoids_tolls, delivery_route_computed_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  if (!force && order.delivery_distance_m != null) {
    return {
      distanceM: Number(order.delivery_distance_m),
      durationS: order.delivery_duration_s,
      avoidsTolls: order.delivery_route_avoids_tolls,
      computedAt: order.delivery_route_computed_at,
    };
  }

  const { data: points } = await db.rpc("order_route_points", { p_order_id: orderId });
  const p = points?.[0];
  // Either end can be missing when an address was typed without picking a suggestion.
  if (!p) return null;

  const route = await drivingRoute({ lat: p.from_lat, lng: p.from_lng }, { lat: p.to_lat, lng: p.to_lng });
  if (!route) return null;

  const stored: StoredRoute = {
    distanceM: Math.round(route.distanceM * 10) / 10,
    durationS: Math.round(route.durationS),
    avoidsTolls: route.avoidsTolls,
    computedAt: new Date().toISOString(),
  };

  await db
    .from("orders")
    .update({
      delivery_distance_m: stored.distanceM,
      delivery_duration_s: stored.durationS,
      delivery_route_avoids_tolls: stored.avoidsTolls,
      delivery_route_computed_at: stored.computedAt,
    })
    .eq("id", orderId);

  return stored;
}
