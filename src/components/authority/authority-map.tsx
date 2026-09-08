"use client";
import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import { STATUS_META, type TrackedTraveller } from "@/lib/mock-authority-data";

function travellerIcon(status: TrackedTraveller["status"]) {
  const color = STATUS_META[status].color;
  const pulse = status === "escalated" || status === "overdue";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:16px;height:16px;">
      ${pulse ? `<div style="position:absolute;inset:-8px;border-radius:999px;background:${color}55;animation:authority-pulse 1.6s ease-out infinite;"></div>` : ""}
      <div style="width:16px;height:16px;border-radius:999px;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 0 4px ${color}33"></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function AuthorityMap({ travellers, center }: { travellers: TrackedTraveller[]; center: { lat: number; lng: number } }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<L.Marker[]>([]);
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const withId = el as HTMLDivElement & { _leaflet_id?: number | null };
    if (withId._leaflet_id) withId._leaflet_id = null;
    const map = L.map(el, { center: [center.lat, center.lng], zoom: 14, zoomControl: false, attributionControl: false });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      if (withId._leaflet_id) withId._leaflet_id = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = travellers.map((t) =>
      L.marker([t.position.lat, t.position.lng], { icon: travellerIcon(t.status) })
        .bindTooltip(`${t.label} — ${STATUS_META[t.status].label}`, { direction: "top", offset: [0, -10] })
        .addTo(map)
    );
  }, [travellers]);

  return (
    <div
      ref={containerRef}
      style={{ height: 340, width: "100%" }}
      className={`overflow-hidden rounded-xl border border-border ${resolvedTheme === "dark" ? "map-dark-tiles" : ""}`}
    />
  );
}
