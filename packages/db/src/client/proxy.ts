import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../database.types";

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

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { response, userId: null, role: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  return { response, userId: user.id, role: profile?.role ?? null };
}
