import type { ServiceClient } from "@getmed/db/service";
import type { PlatformSettingsRow } from "@getmed/db/types";

export const DEFAULT_SETTINGS: PlatformSettingsRow = {
  id: 1,
  search_radius_km: 10,
  sla_minutes: 30,
  default_zone1_fee: 5,
  default_zone2_fee: 8,
  default_zone3_fee: 12,
  default_zone4_fee: 18,
  default_remote_per_km: 1.2,
  zone1_max_km: 6,
  zone2_max_km: 13,
  zone3_max_km: 25,
  zone4_max_km: 50,
  remote_quote_span: 6,
  failed_delivery_fee_percent: 100,
  updated_at: new Date(0).toISOString(),
};

/** Platform-wide settings (admin-editable). Read at query time — no reprocessing on change. */
export async function getPlatformSettings(db: ServiceClient): Promise<PlatformSettingsRow> {
  const { data } = await db.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function updatePlatformSettings(
  db: ServiceClient,
  patch: Partial<Pick<PlatformSettingsRow,   | "search_radius_km"
    | "sla_minutes"
    | "failed_delivery_fee_percent"
    | "default_zone1_fee"
    | "default_zone2_fee"
    | "default_zone3_fee"
    | "default_zone4_fee"
    | "default_remote_per_km"
    | "zone1_max_km"
    | "zone2_max_km"
    | "zone3_max_km"
    | "zone4_max_km"
    | "remote_quote_span">>,
): Promise<PlatformSettingsRow> {
  const { data, error } = await db
    .from("platform_settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
