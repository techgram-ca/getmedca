"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { SearchResult } from "@getmed/core/geo";

type Props = {
  origin: { lat: number; lng: number } | null;
  results: SearchResult[];
  activeId: string | null;
  onActivate: (id: string | null) => void;
};

/** Mapbox GL map synced with the results list (hover/click ↔ marker). */
export function SearchMap({ origin, results, activeId, onActivate }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: origin ? [origin.lng, origin.lat] : [-79.38, 43.65],
      zoom: origin ? 12 : 9,
      attributionControl: false,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }));
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();

    const bounds = new mapboxgl.LngLatBounds();
    if (origin) {
      const el = document.createElement("div");
      el.className = "size-4 rounded-full border-2 border-white bg-accent-500 shadow";
      new mapboxgl.Marker({ element: el }).setLngLat([origin.lng, origin.lat]).addTo(m);
      bounds.extend([origin.lng, origin.lat]);
    }
    results.forEach((r, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", r.name);
      el.className =
        "gm-marker flex size-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-xs font-semibold text-white shadow-pop transition-transform";
      el.textContent = String(i + 1);
      el.addEventListener("click", () => onActivate(r.id));
      el.addEventListener("mouseenter", () => onActivate(r.id));
      const mk = new mapboxgl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(m);
      markers.current.set(r.id, mk);
      bounds.extend([r.lng, r.lat]);
    });
    if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
  }, [origin, results, onActivate]);

  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const el = mk.getElement();
      el.style.transform = `${el.style.transform.replace(/ scale\([^)]*\)/, "")}${id === activeId ? " scale(1.25)" : ""}`;
      el.style.zIndex = id === activeId ? "10" : "1";
      el.classList.toggle("bg-accent-500", id === activeId);
      el.classList.toggle("bg-brand-600", id !== activeId);
    });
  }, [activeId]);

  return <div ref={container} className="h-full w-full" />;
}
