import { create } from "zustand";
import type { GeoPoint } from "@/lib/geo";

export type JourneyStatus = "idle" | "active" | "delayed" | "escalated" | "completed";
export type TravelMode = "walking" | "bus" | "metro" | "cab" | "scooty" | "school_bus";
export type EmergencyFlag = "route-deviation" | "abnormal-stop" | "escalated";

export interface JourneyRoute {
  destinationLabel: string;
  distanceText: string;
  durationText: string;
  durationSeconds: number;
  safetyScore: number;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  // The planned route polyline, when the routing API returned one — this is
  // what live route-deviation tracking compares a traveller's real GPS
  // position against. Optional because a straight-line fallback route has
  // no polyline to deviate from.
  path?: GeoPoint[];
}

export interface CompletedJourney {
  id: string;
  destination: string;
  mode: TravelMode;
  distanceText: string;
  safetyScore: number;
  completedAt: string; // ISO timestamp
  wasEscalated: boolean;
  // Anomalies actually detected during this journey from live tracking
  // (real-time route deviation / unexpected-stop detection), not just the
  // final escalation state — see use-journey-tracking.ts. Lets "emergency
  // journeys" be retrieved after the fact, not only flagged live.
  emergencyFlags: EmergencyFlag[];
}

interface JourneyState {
  status: JourneyStatus;
  destination: string | null;
  mode: TravelMode | null;
  route: JourneyRoute | null;
  guardianOnline: boolean;
  history: CompletedJourney[];
  setStatus: (status: JourneyStatus) => void;
  startJourney: (destination: string, mode: TravelMode, route: JourneyRoute) => void;
  endJourney: (emergencyFlags?: EmergencyFlag[]) => void;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  status: "idle",
  destination: null,
  mode: null,
  route: null,
  guardianOnline: true,
  history: [],
  setStatus: (status) => set({ status }),
  startJourney: (destination, mode, route) =>
    set({ status: "active", destination, mode, route }),
  endJourney: (emergencyFlags = []) => {
    // Record the journey as completed right away — the dashboard's "Recent
    // journeys" list and stat tiles read straight from this history, so
    // ending a journey shows up there immediately, not on the next reload.
    const { destination, mode, route, status } = get();
    if (destination && mode && route) {
      const wasEscalated = status === "escalated";
      const flags = new Set(emergencyFlags);
      if (wasEscalated) flags.add("escalated");
      const entry: CompletedJourney = {
        id: `${Date.now()}`,
        destination,
        mode,
        distanceText: route.distanceText,
        safetyScore: route.safetyScore,
        completedAt: new Date().toISOString(),
        wasEscalated,
        emergencyFlags: Array.from(flags),
      };
      set((s) => ({ history: [entry, ...s.history].slice(0, 20) }));
    }
    set({ status: "idle", destination: null, mode: null, route: null });
  },
}));

// Journeys flagged for a real anomaly — escalated, a live route-deviation
// alert, or an abnormal-stop alert — for "show me only the risky journeys"
// views (guardian dashboard, a filtered history list) without re-deriving
// the logic at every call site.
export function selectEmergencyJourneys(history: CompletedJourney[]): CompletedJourney[] {
  return history.filter((j) => j.emergencyFlags.length > 0);
}
