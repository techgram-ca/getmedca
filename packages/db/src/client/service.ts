import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export type ServiceClient = SupabaseClient<Database>;

/**
 * Service-role client. Bypasses RLS — ONLY use inside route handlers / server
 * code after performing an explicit authorization check. Never ship to the browser.
 */
export function createServiceClient(): ServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
