"use client";

import * as React from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget. When no site key is configured (local dev) it
 * renders nothing and immediately reports an empty token — the server accepts
 * that only outside production.
 */
export function Turnstile({ onToken, className }: { onToken: (token: string | null) => void; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const cb = React.useRef(onToken);
  cb.current = onToken;

  React.useEffect(() => {
    if (!siteKey) {
      cb.current("");
      return;
    }
    let widgetId: string | undefined;
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
        theme: "light",
      });
    };
    if (window.turnstile) render();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className={className} />;
}
