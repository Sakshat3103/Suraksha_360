import { create } from "zustand";

export type ReportCategory =
  | "Harassment"
  | "Broken Streetlights"
  | "Road Hazard"
  | "Unsafe Area"
  | "Accident"
  | "Suspicious Activity"
  | "Police Patrol"
  | "Medical Emergency";

// Very lightweight, client-side fake/spam heuristic — this is a prototype,
// not a moderation system, so it's intentionally simple and transparent:
// - a near-empty description reads as low-effort/likely fake -> "flagged"
// - a second, independent report of the same problem nearby within 24h
//   reads as corroboration -> both get bumped to "verified"
// - otherwise a report starts "unverified" until something confirms it
export type ReportTrust = "unverified" | "verified" | "flagged";

export interface CommunityReport {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  lat: number;
  lng: number;
  imageDataUrl?: string;
  createdAt: string; // ISO
  trust: ReportTrust;
}

interface CommunityState {
  reports: CommunityReport[];
  addReport: (r: Omit<CommunityReport, "id" | "createdAt" | "trust">) => void;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Seeded with a handful of realistic, plausible reports around the MUJ /
// Bagru area so the map, AI summary, and heatmap are demoable immediately —
// not an empty screen — while still being a real, growing, user-writable
// list (see the report dialog). This is in-memory/session-only; wiring it
// to a `community_reports` Supabase table (RLS: insert by anyone
// authenticated, select public) is a drop-in swap for production.
const now = Date.now();
const seedReports: CommunityReport[] = [
  {
    id: "seed-1",
    category: "Harassment",
    title: "Catcalling near NH48 service lane",
    description: "Group of men catcalling women walking from the bus stand after dark.",
    lat: 26.8438,
    lng: 75.5628,
    createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    trust: "verified",
  },
  {
    id: "seed-2",
    category: "Broken Streetlights",
    title: "Streetlights out near campus back gate",
    description: "Three consecutive streetlights not working, stretch is very dark after 8 PM.",
    lat: 26.8452,
    lng: 75.5601,
    createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    trust: "verified",
  },
  {
    id: "seed-3",
    category: "Suspicious Activity",
    title: "Bike following pedestrians repeatedly",
    description: "Same bike circled the block twice, slowed near women walking alone.",
    lat: 26.8461,
    lng: 75.5645,
    createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    trust: "verified",
  },
  {
    id: "seed-4",
    category: "Police Patrol",
    title: "Regular patrol near Bagru bus stand",
    description: "PCR van doing rounds every hour in the evening — reassuring presence.",
    lat: 26.8409,
    lng: 75.5589,
    createdAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
    trust: "verified",
  },
  {
    id: "seed-5",
    category: "Harassment",
    title: "Verbal harassment outside market",
    description: "Reported by a student near the local market entrance around 9 PM.",
    lat: 26.8445,
    lng: 75.5634,
    createdAt: new Date(now - 1000 * 60 * 60 * 70).toISOString(),
    trust: "verified",
  },
];

export const useCommunityStore = create<CommunityState>((set) => ({
  reports: seedReports,
  addReport: (r) =>
    set((s) => {
      const isLowEffort = r.description.trim().length < 10;
      const corroborated = s.reports.some(
        (existing) =>
          existing.category === r.category &&
          haversineMeters(existing, r) < 300 &&
          Date.now() - new Date(existing.createdAt).getTime() < 1000 * 60 * 60 * 24
      );
      const trust: ReportTrust = isLowEffort ? "flagged" : corroborated ? "verified" : "unverified";
      const next: CommunityReport = { ...r, id: `${Date.now()}`, createdAt: new Date().toISOString(), trust };
      // If this corroborates an earlier unverified report of the same issue, bump that one too.
      const updatedExisting = corroborated
        ? s.reports.map((existing) =>
            existing.category === r.category &&
            haversineMeters(existing, r) < 300 &&
            existing.trust === "unverified"
              ? { ...existing, trust: "verified" as ReportTrust }
              : existing
          )
        : s.reports;
      return { reports: [next, ...updatedExisting] };
    }),
}));
