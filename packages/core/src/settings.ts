import type { ServiceClient } from "@getmed/db/service";
import type { PlatformSettingsRow } from "@getmed/db/types";

export const DEFAULT_SETTINGS: PlatformSettingsRow = {
  id: 1,
  search_radius_km: 10,
  sla_minutes: 30,
  default_local_fee: 5,
  default_gta_fee: 8,
  default_extended_fee: 12,
  updated_at: new Date(0).toISOString(),
};

/** Platform-wide settings (admin-editable). Read at query time — no reprocessing on change. */
export async function getPlatformSettings(db: ServiceClient): Promise<PlatformSettingsRow> {
  const { data } = await db.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function updatePlatformSettings(
  db: ServiceClient,
  patch: Partial<Pick<PlatformSettingsRow, "search_radius_km" | "sla_minutes" | "default_local_fee" | "default_gta_fee" | "default_extended_fee">>,
): Promise<PlatformSettingsRow> {
  const { data, error } = await db
    .from("platform_settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
