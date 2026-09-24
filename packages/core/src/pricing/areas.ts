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

export type PostalAreaRowView = {
  fsa: string;
  city: string;
  province: string;
  /** How many pharmacies have tagged this postal area to a zone. */
  taggedBy: number;
};

export type PostalAreaCityView = { city: string; province: string; areas: PostalAreaRowView[] };

/**
 * Every postal area with how many pharmacies price against it.
 *
 * The count is what makes deletion safe to offer: `pharmacy_zone_areas.fsa`
 * cascades, so removing a postal area silently untags it for every pharmacy
 * using it, and their deliveries there drop to Zone 5 without an error.
 */
export async function listPostalAreasDetailed(db: ServiceClient): Promise<PostalAreaCityView[]> {
  const [{ data: areas }, { data: tags }] = await Promise.all([
    db.from("postal_areas").select("fsa, city, province").order("city").order("fsa"),
    db.from("pharmacy_zone_areas").select("fsa"),
  ]);
  const usage = new Map<string, number>();
  for (const t of tags ?? []) usage.set(t.fsa, (usage.get(t.fsa) ?? 0) + 1);

  const byCity = new Map<string, PostalAreaCityView>();
  for (const a of areas ?? []) {
    const entry = byCity.get(a.city) ?? { city: a.city, province: a.province, areas: [] };
    entry.areas.push({ fsa: a.fsa, city: a.city, province: a.province, taggedBy: usage.get(a.fsa) ?? 0 });
    byCity.set(a.city, entry);
  }
  return [...byCity.values()];
}

/**
 * Adds postal areas to a city, and moves any that currently sit under another
 * city. Pharmacy tags survive a move — the zone is keyed on the FSA, and the
 * city is only a label.
 */
export async function upsertPostalAreas(
  db: ServiceClient,
  city: string,
  province: string,
  fsas: string[],
): Promise<{ added: number; moved: string[] }> {
  const name = city.trim();
  if (!name) throw new Error("Enter a city name");
  const unique = [...new Set(fsas)];
  if (unique.length === 0) return { added: 0, moved: [] };

  const { data: existing } = await db.from("postal_areas").select("fsa, city").in("fsa", unique);
  const moved = (existing ?? []).filter((e) => e.city !== name).map((e) => `${e.fsa} (was ${e.city})`);

  const { error } = await db
    .from("postal_areas")
    .upsert(unique.map((fsa) => ({ fsa, city: name, province })), { onConflict: "fsa" });
  if (error) throw error;
  return { added: unique.length - (existing?.length ?? 0), moved };
}

/** Renames a city across all of its postal areas. Pricing is unaffected. */
export async function renamePostalCity(db: ServiceClient, from: string, to: string): Promise<number> {
  const name = to.trim();
  if (!name) throw new Error("Enter a city name");
  const { data, error } = await db.from("postal_areas").update({ city: name }).eq("city", from).select("fsa");
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Removes postal areas. Any pharmacy zone tag on them goes with it — the
 * caller is responsible for having shown the count first.
 */
export async function deletePostalAreas(db: ServiceClient, fsas: string[]): Promise<void> {
  if (fsas.length === 0) return;
  const { error } = await db.from("postal_areas").delete().in("fsa", fsas);
  if (error) throw error;
}
