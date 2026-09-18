import type { ServiceClient } from "@getmed/db/service";

/**
 * Web Push to a driver's stored subscription (driver PWA). Silently no-ops
 * when VAPID keys are not configured or the driver hasn't opted in.
 */
export async function pushToDriver(db: ServiceClient, driverId: string, payload: { title: string; body: string; url?: string }) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  const { data } = await db.from("drivers").select("push_subscription").eq("id", driverId).maybeSingle();
  const sub = data?.push_subscription as { endpoint?: string; keys?: { p256dh: string; auth: string } } | null;
  if (!sub?.endpoint || !sub.keys) return;
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@getmed.ca", pub, priv);
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 3600 });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // Expired/unsubscribed endpoint: clear it so we stop retrying.
    if (status === 404 || status === 410) await db.from("drivers").update({ push_subscription: null }).eq("id", driverId);
    else console.error("[push] failed", err instanceof Error ? err.message : err);
  }
}
