import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { supabaseSecretKey, supabaseUrl } from "./env";

export type ServiceClient = SupabaseClient<Database>;

/**
 * Service-role client. Bypasses RLS — ONLY use inside route handlers / server
 * code after performing an explicit authorization check. Never ship to the browser.
 */
export function createServiceClient(): ServiceClient {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, then redeploy");
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
