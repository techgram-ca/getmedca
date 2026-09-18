/**
 * Supabase credentials. Prefers the current key format (sb_publishable_… /
 * sb_secret_…) and falls back to the legacy anon / service_role JWT keys.
 */
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Browser-safe key: publishable (preferred) or legacy anon. */
export function supabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Server-only key that bypasses RLS: secret (preferred) or legacy service_role. */
export function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}
