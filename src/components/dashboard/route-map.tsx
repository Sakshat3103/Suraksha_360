"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint, SafeZone, SafeZoneCategory } from "@/lib/geo";

const SAFE_ZONE_EMOJI: Record<SafeZoneCategory, string> = {
  temple: "🛕",
  hospital: "🏥",
  police: "👮",
  store: "🏪",
  college: "🏫",
  hotel: "🏨",
  metro: "🚇",
  fuel: "⛽",
};

function safeZoneIcon(category: SafeZoneCategory) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:999px;background:rgba(20,20,30,0.85);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:12px;">${SAFE_ZONE_EMOJI[category]}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Leaflet's default marker icons reference image files that don't resolve under
// Next.js bundling — swap in inline SVG-based divIcons instead.
const originIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:999px;background:#7C5CFC;border:2px solid white;box-shadow:0 0 0 4px rgba(124,92,252,0.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:999px;background:#4FD9B4;border:2px solid white;box-shadow:0 0 0 4px rgba(79,217,180,0.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Built imperatively (rather than via react-leaflet's <MapContainer>) because
// Next.js dev mode double-mounts client components, and react-leaflet throws
// "Map container is already initialized" when that happens. Managing the
// Leaflet instance ourselves in a ref lets us guard against double-init and
// dispose it cleanly on unmount.
export function RouteMap({
  origin,
  destination,
  path,
  height = 220,
  safeZones,
}: {
  origin: GeoPoint;
  destination?: GeoPoint;
  path?: GeoPoint[];
  height?: number;
  safeZones?: SafeZone[];
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const originMarkerRef = React.useRef<L.Marker | null>(null);
  const destinationMarkerRef = React.useRef<L.Marker | null>(null);
  const lineRef = React.useRef<L.Polyline | null>(null);
  const safeZoneMarkersRef = React.useRef<L.Marker[]>([]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Guard against Next.js dev-mode double-invoking this effect on the
    // same DOM node, which is what triggers Leaflet's "already initialized" error.
    const withId = el as HTMLDivElement & { _leaflet_id?: number | null };
    if (withId._leaflet_id) {
      withId._leaflet_id = null;
    }

    const map = L.map(el, {
      center: [origin.lat, origin.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Plain OpenStreetMap tiles — CARTO's dark tiles now require an API key,
    // OSM's standard tiles stay free and keyless. A CSS filter (see
    // .map-dark-tiles in globals.css) recolors them to match the app's dark
    // theme without needing a paid dark basemap.
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: "map-dark-tiles",
    });
    tileLayer.addTo(map);

    originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      lineRef.current = null;
      safeZoneMarkersRef.current.forEach((m) => m.remove());
      safeZoneMarkersRef.current = [];
      if (withId._leaflet_id) withId._leaflet_id = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep origin marker + view in sync
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    originMarkerRef.current?.setLatLng([origin.lat, origin.lng]);
    if (!destination) map.setView([origin.lat, origin.lng], map.getZoom());
  }, [origin, destination]);

  // Destination marker
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!destination) {
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      return;
    }

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    } else {
      destinationMarkerRef.current = L.marker([destination.lat, destination.lng], {
        icon: destinationIcon,
      }).addTo(map);
    }
  }, [destination]);

  // Route line (actual path if available, else a dashed straight line)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    lineRef.current?.remove();
    lineRef.current = null;

    if (!destination) return;

    const points: L.LatLngExpression[] =
      path && path.length > 1
        ? path.map((p) => [p.lat, p.lng])
        : [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ];

    lineRef.current = L.polyline(points, {
      color: "#7C5CFC",
      weight: path && path.length > 1 ? 4 : 3,
      opacity: path && path.length > 1 ? 0.85 : 0.6,
      dashArray: path && path.length > 1 ? undefined : "6 6",
    }).addTo(map);

    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [origin, destination, path]);

  // Verified safe-zone markers (hospitals, police, temples, colleges,
  // hotels, metro stations, fuel stations, stores)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    safeZoneMarkersRef.current.forEach((m) => m.remove());
    safeZoneMarkersRef.current = (safeZones ?? []).map((zone) =>
      L.marker([zone.lat, zone.lng], { icon: safeZoneIcon(zone.category) })
        .bindTooltip(zone.label, { direction: "top", offset: [0, -12] })
        .addTo(map)
    );
  }, [safeZones]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="overflow-hidden rounded-xl border border-foreground/10"
    />
  );
}
