"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient<Database>(supabaseUrl()!, supabasePublishableKey()!);
  return client;
}
