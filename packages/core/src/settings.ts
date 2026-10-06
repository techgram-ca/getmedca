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
  remote_quote_span: 6,
  failed_delivery_fee_percent: 100,
  default_refrigeration_fee: 0,
  launched_at: null,
  launch_message: null,
  updated_at: new Date(0).toISOString(),
};

/** Platform-wide settings (admin-editable). Read at query time — no reprocessing on change. */
export async function getPlatformSettings(db: ServiceClient): Promise<PlatformSettingsRow> {
  const { data } = await db.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

/**
 * Is the patient site open for business?
 *
 * Everything patient-facing asks this: the homepage decides between the real
 * site and a coming-soon page, the pharmacy pages decide whether their buttons
 * do anything, and both order and consultation creation refuse outright. The
 * refusals are what make it real — hiding a button only moves the problem to
 * whoever has the direct link.
 */
export function isLaunched(settings: Pick<PlatformSettingsRow, "launched_at">): boolean {
  return settings.launched_at != null;
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
    | "launched_at"
    | "launch_message"
    | "default_remote_per_km"
    | "default_refrigeration_fee"
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
