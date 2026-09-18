"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@getmed/db/browser";
import { toast } from "@getmed/ui";

/** Synthesized two-tone chime — no audio asset required. */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {
    /* audio not available */
  }
}

/**
 * Subscribes to Supabase Realtime for this pharmacy's orders. Refreshes the
 * current server-rendered page on any change; plays a chime + toast when a
 * verified order becomes visible (phone_verified_at set or new pending row).
 */
export function RealtimeOrders({ pharmacyId, sound }: { pharmacyId: string; sound: boolean }) {
  const router = useRouter();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders:${pharmacyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `pharmacy_id=eq.${pharmacyId}` },
        (payload) => {
          const row = payload.new as { id?: string; status?: string; phone_verified_at?: string | null } | undefined;
          if (row?.id && row.status === "pending" && row.phone_verified_at && !seen.current.has(row.id)) {
            seen.current.add(row.id);
            if (sound) chime();
            toast("New order received", { description: "Respond within 30 minutes.", action: { label: "View", onClick: () => router.push(`/orders/${row.id}`) } });
            document.dispatchEvent(new CustomEvent("getmed:new-order"));
          }
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultation_requests", filter: `pharmacy_id=eq.${pharmacyId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pharmacyId, sound, router]);

  return null;
}
