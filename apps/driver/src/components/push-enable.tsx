"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@getmed/ui";
import { savePushSubscription } from "@/lib/actions/orders";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Web Push opt-in. Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY; hidden otherwise. */
const noop = () => () => {};

export function PushEnable({ hasSubscription }: { hasSubscription: boolean }) {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [dismissed, setDismissed] = useState(false);
  // Client-only capability check without a hydration mismatch or setState-in-effect.
  const canPrompt = useSyncExternalStore(
    noop,
    () => typeof Notification !== "undefined" && "serviceWorker" in navigator && Notification.permission !== "denied",
    () => false,
  );
  const show = !!key && !hasSubscription && canPrompt && !dismissed;
  const setShow = (v: boolean) => setDismissed(!v);
  if (!show) return null;
  const enable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key!) });
      await savePushSubscription(sub.toJSON());
      setShow(false);
    } catch {
      setShow(false);
    }
  };
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm">
      <BellRing className="size-5 shrink-0 text-brand-700" />
      <span className="flex-1">Get notified when you're assigned a delivery.</span>
      <Button size="sm" onClick={enable}>Enable</Button>
    </div>
  );
}
