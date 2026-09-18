import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Cookie-bound Supabase client for Server Components, Route Handlers and
 * Server Actions. Respects RLS for the signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then redeploy");
  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the proxy refreshes sessions instead.
          }
        },
      },
    },
  );
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;
