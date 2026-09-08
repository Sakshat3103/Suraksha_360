"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CommunityReport, ReportCategory } from "@/store/use-community-store";

const CATEGORY_COLOR: Record<ReportCategory, string> = {
  Harassment: "#F87171",
  "Broken Streetlights": "#FBBF24",
  "Road Hazard": "#FB923C",
  "Unsafe Area": "#F97316",
  Accident: "#EF4444",
  "Suspicious Activity": "#A78BFA",
  "Police Patrol": "#4FD9B4",
  "Medical Emergency": "#F472B6",
};

function reportIcon(category: ReportCategory) {
  const color = CATEGORY_COLOR[category];
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 0 5px ${color}33"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function CommunityMap({ reports, center }: { reports: CommunityReport[]; center: { lat: number; lng: number } }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<L.Marker[]>([]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const withId = el as HTMLDivElement & { _leaflet_id?: number | null };
    if (withId._leaflet_id) withId._leaflet_id = null;

    const map = L.map(el, { center: [center.lat, center.lng], zoom: 14, zoomControl: false, attributionControl: false });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      className: "map-dark-tiles",
    }).addTo(map);

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
    markersRef.current = reports.map((r) =>
      L.marker([r.lat, r.lng], { icon: reportIcon(r.category) })
        .bindTooltip(`${r.category}: ${r.title}`, { direction: "top", offset: [0, -10] })
        .addTo(map)
    );
  }, [reports]);

  return (
    <div
      ref={containerRef}
      style={{ height: 280, width: "100%" }}
      className="overflow-hidden rounded-xl border border-foreground/10"
    />
  );
}
