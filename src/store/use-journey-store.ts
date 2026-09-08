import { create } from "zustand";

export type JourneyStatus = "idle" | "active" | "delayed" | "escalated" | "completed";
export type TravelMode = "walking" | "bus" | "metro" | "cab" | "scooty" | "school_bus";

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
}

export interface CompletedJourney {
  id: string;
  destination: string;
  mode: TravelMode;
  distanceText: string;
  safetyScore: number;
  completedAt: string; // ISO timestamp
  wasEscalated: boolean;
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
  endJourney: () => void;
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
  endJourney: () => {
    // Record the journey as completed right away — the dashboard's "Recent
    // journeys" list and stat tiles read straight from this history, so
    // ending a journey shows up there immediately, not on the next reload.
    const { destination, mode, route, status } = get();
    if (destination && mode && route) {
      const entry: CompletedJourney = {
        id: `${Date.now()}`,
        destination,
        mode,
        distanceText: route.distanceText,
        safetyScore: route.safetyScore,
        completedAt: new Date().toISOString(),
        wasEscalated: status === "escalated",
      };
      set((s) => ({ history: [entry, ...s.history].slice(0, 20) }));
    }
    set({ status: "idle", destination: null, mode: null, route: null });
  },
}));
