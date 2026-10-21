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

// A single emergency anomaly as it actually happened, with the real clock
// time it was detected — not just "this journey had a deviation" but "at
// 7:42:18 PM". This is what makes a past journey's emergency history
// retrievable after the fact instead of only visible live in the timeline
// (which resets when the next journey starts).
export interface EmergencyEvent {
  type: EmergencyFlag;
  at: string; // ISO timestamp of the moment this was detected/triggered
  detail?: string; // e.g. "187m off route" or "stationary for 6 min"
}

export interface CompletedJourney {
  id: string;
  destination: string;
  mode: TravelMode;
  distanceText: string;
  safetyScore: number;
  completedAt: string; // ISO timestamp
  wasEscalated: boolean;
  // Kept for quick filtering (selectEmergencyJourneys, badges) — derived
  // from emergencyEvents, same values, just without timestamps.
  emergencyFlags: EmergencyFlag[];
  // The full, timestamped record: every anomaly this journey actually hit
  // and the exact moment it happened. This is the retrievable "at what
  // time was the emergency triggered" log for this journey.
  emergencyEvents: EmergencyEvent[];
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
  endJourney: (emergencyEvents?: EmergencyEvent[]) => void;
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
  endJourney: (emergencyEvents = []) => {
    // Record the journey as completed right away — the dashboard's "Recent
    // journeys" list and stat tiles read straight from this history, so
    // ending a journey shows up there immediately, not on the next reload.
    const { destination, mode, route, status } = get();
    if (destination && mode && route) {
      const wasEscalated = status === "escalated";
      const events = [...emergencyEvents];
      // An escalation that wasn't already logged with its own timestamp
      // (e.g. the SOS trigger time wasn't passed in) still gets recorded —
      // "now" is the honest fallback, better than silently dropping it.
      if (wasEscalated && !events.some((e) => e.type === "escalated")) {
        events.push({ type: "escalated", at: new Date().toISOString() });
      }
      const entry: CompletedJourney = {
        id: `${Date.now()}`,
        destination,
        mode,
        distanceText: route.distanceText,
        safetyScore: route.safetyScore,
        completedAt: new Date().toISOString(),
        wasEscalated,
        emergencyFlags: Array.from(new Set(events.map((e) => e.type))),
        emergencyEvents: events,
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

// Retrieve one journey by id (for a detail view / "show me exactly when
// the emergency fired for this journey") rather than re-filtering history
// at every call site.
export function selectJourneyById(history: CompletedJourney[], id: string): CompletedJourney | undefined {
  return history.find((j) => j.id === id);
}
