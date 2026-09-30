"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * The date window is the only filter that reaches the server: it goes in the
 * URL so the page refetches, and so a filtered view can be linked or reloaded.
 * Everything else narrows the loaded rows in the browser.
 */
export function useDateWindow(from: string, to: string) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, start] = useTransition();

  const setWindow = (nextFrom: string, nextTo: string) => {
    // A half-typed date arrives as "" from the input; ignore it until complete.
    if (!nextFrom || !nextTo) return;
    if (nextFrom === from && nextTo === to) return;
    const next = new URLSearchParams(params);
    next.set("from", nextFrom);
    next.set("to", nextTo);
    start(() => router.push(`?${next}`, { scroll: false }));
  };

  return { setWindow, loading };
}
