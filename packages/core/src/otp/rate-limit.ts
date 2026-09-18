import type { ServiceClient } from "@getmed/db/service";
import { RateLimitedError } from "../errors";

/** DB-backed sliding window; throws once `limit` is exceeded within `windowSeconds`. */
export async function enforceRateLimit(db: ServiceClient, key: string, limit: number, windowSeconds: number) {
  const { data, error } = await db.rpc("bump_rate_limit", { p_key: key, p_window_seconds: windowSeconds });
  if (error) throw error;
  if ((data ?? 0) > limit) throw new RateLimitedError();
}
