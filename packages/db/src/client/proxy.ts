import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

export type SessionInfo = {
  response: NextResponse;
  userId: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
};

/**
 * Refreshes the Supabase session cookie on every request (used from each app's
 * proxy.ts) and returns the caller's role for route protection.
 */
export async function updateSession(request: NextRequest): Promise<SessionInfo> {
  let response = NextResponse.next({ request });

  const url = supabaseUrl();
  const anonKey = supabasePublishableKey();
  if (!url || !anonKey) {
    // Misconfigured deployment: treat the visitor as signed out instead of
    // failing every request with a 500, so login pages still render.
    console.error("[auth] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set; redeploy after adding them.");
    return { response, userId: null, role: null };
  }

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { response, userId: null, role: null };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return { response, userId: user.id, role: profile?.role ?? null };
  } catch (err) {
    // Network/auth-service failure: fail closed (signed out) rather than 500.
    console.error("[auth] session refresh failed", err instanceof Error ? err.message : err);
    return { response, userId: null, role: null };
  }
}
