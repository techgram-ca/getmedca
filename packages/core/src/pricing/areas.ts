import type { ServiceClient } from "@getmed/db/service";
import type { FixedZone } from "./zones";

export type PostalAreaCity = {
  city: string;
  fsas: string[];
};

/** Every postal area on file, grouped by city, for the admin picker. */
export async function listPostalAreas(db: ServiceClient): Promise<PostalAreaCity[]> {
  const { data } = await db.from("postal_areas").select("fsa, city").order("city").order("fsa");
  const byCity = new Map<string, string[]>();
  for (const row of data ?? []) {
    byCity.set(row.city, [...(byCity.get(row.city) ?? []), row.fsa]);
  }
  return [...byCity.entries()].map(([city, fsas]) => ({ city, fsas }));
}

/** The zones a pharmacy has tagged, keyed by FSA. */
export async function loadZoneAreas(db: ServiceClient, pharmacyId: string): Promise<Record<string, FixedZone>> {
  const { data } = await db.from("pharmacy_zone_areas").select("fsa, zone").eq("pharmacy_id", pharmacyId);
  return Object.fromEntries((data ?? []).map((r) => [r.fsa, r.zone as FixedZone]));
}

/**
 * Replaces a pharmacy's postal-area tags in one go.
 *
 * Written as a delete-then-insert rather than a diff: the editor always submits
 * the complete set, and a partial update would silently leave stale tags behind
 * that keep pricing orders.
 */
export async function saveZoneAreas(
  db: ServiceClient,
  pharmacyId: string,
  assignments: Record<string, FixedZone | null>,
): Promise<void> {
  const rows = Object.entries(assignments)
    .filter(([, zone]) => zone != null)
    .map(([fsa, zone]) => ({ pharmacy_id: pharmacyId, fsa, zone: zone as FixedZone }));

  const { error: cleared } = await db.from("pharmacy_zone_areas").delete().eq("pharmacy_id", pharmacyId);
  if (cleared) throw cleared;
  if (rows.length === 0) return;
  const { error } = await db.from("pharmacy_zone_areas").insert(rows);
  if (error) throw error;
}

/** How many postal areas a pharmacy has tagged. Used to gate approval. */
export async function countZoneAreas(db: ServiceClient, pharmacyId: string): Promise<number> {
  const { count } = await db
    .from("pharmacy_zone_areas")
    .select("fsa", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacyId);
  return count ?? 0;
}


export type DeliveryConfigInput = {
  /** Null means "use the platform default". */
  remotePerKm: number | null;
};

/**
 * A pharmacy's own Zone 5 rate. The row is deleted when nothing is overridden,
 * keeping the table to pharmacies that actually differ from the platform.
 */
export async function savePharmacyDeliveryConfig(
  db: ServiceClient,
  pharmacyId: string,
  input: DeliveryConfigInput,
): Promise<void> {
  if (input.remotePerKm == null) {
    const { error } = await db.from("pharmacy_delivery_config").delete().eq("pharmacy_id", pharmacyId);
    if (error) throw error;
    return;
  }
  const { error } = await db.from("pharmacy_delivery_config").upsert(
    { pharmacy_id: pharmacyId, remote_per_km: input.remotePerKm, updated_at: new Date().toISOString() },
    { onConflict: "pharmacy_id" },
  );
  if (error) throw error;
}

/** Per-pharmacy overrides for several pharmacies at once, for the admin table. */
export async function loadDeliveryConfigs(db: ServiceClient, pharmacyIds: string[]) {
  if (pharmacyIds.length === 0) return new Map<string, DeliveryConfigInput>();
  const { data } = await db.from("pharmacy_delivery_config").select("*").in("pharmacy_id", pharmacyIds);
  return new Map(
    (data ?? []).map((c) => [
      c.pharmacy_id,
      { remotePerKm: c.remote_per_km == null ? null : Number(c.remote_per_km) } satisfies DeliveryConfigInput,
    ]),
  );
}
