"use client";

import { create } from "zustand";
import type { GeoPoint } from "@/lib/geo";

// Real-time route-deviation and abnormal-stop detection progress, kept in
// a global store rather than component-local state/refs. This is what
// makes detection continue correctly in real time across navigation: if
// this lived in useState/useRef inside the dashboard's journey card (as it
// used to), navigating to another page and back would unmount that
// component and silently reset an in-progress deviation breach or stop
// timer back to zero, even though the traveller never actually returned to
// the route or started moving again. Anchoring it here means the only
// thing that resets this state is an explicit journey start/end, not a
// page navigation.

interface StoppedAnchor {
  anchor: GeoPoint;
  since: number; // ms epoch
}

interface DeviationBreach {
  since: number; // ms epoch
  thresholdAtBreach: number; // the accuracy-widened threshold active when the breach started
}

interface JourneyTrackingState {
  routeDeviationMeters: number;
  unexpectedStopSeconds: number;
  routeDeviationAlertAt: string | null;
  abnormalStopAlertAt: string | null;
  routeDeviationDetail: string | null;
  abnormalStopDetail: string | null;
  stoppedSince: StoppedAnchor | null;
  deviationBreach: DeviationBreach | null;

  setRouteDeviationMeters: (meters: number) => void;
  setUnexpectedStopSeconds: (seconds: number) => void;
  // Each "confirm" is a no-op once already set — first confirmation wins,
  // same latching behaviour the old local-state version had.
  confirmRouteDeviationAlert: (atIso: string, detail: string) => void;
  confirmAbnormalStopAlert: (atIso: string, detail: string) => void;
  setStoppedSince: (value: StoppedAnchor | null) => void;
  setDeviationBreach: (value: DeviationBreach | null) => void;
  reset: () => void;
}

const initialTrackingState = {
  routeDeviationMeters: 0,
  unexpectedStopSeconds: 0,
  routeDeviationAlertAt: null,
  abnormalStopAlertAt: null,
  routeDeviationDetail: null,
  abnormalStopDetail: null,
  stoppedSince: null,
  deviationBreach: null,
} satisfies Partial<JourneyTrackingState>;

export const useJourneyTrackingStore = create<JourneyTrackingState>((set) => ({
  ...initialTrackingState,

  setRouteDeviationMeters: (meters) => set({ routeDeviationMeters: meters }),
  setUnexpectedStopSeconds: (seconds) => set({ unexpectedStopSeconds: seconds }),
  confirmRouteDeviationAlert: (atIso, detail) =>
    set((s) =>
      s.routeDeviationAlertAt
        ? s
        : { routeDeviationAlertAt: atIso, routeDeviationDetail: detail }
    ),
  confirmAbnormalStopAlert: (atIso, detail) =>
    set((s) =>
      s.abnormalStopAlertAt
        ? s
        : { abnormalStopAlertAt: atIso, abnormalStopDetail: detail }
    ),
  setStoppedSince: (value) => set({ stoppedSince: value }),
  setDeviationBreach: (value) => set({ deviationBreach: value }),
  reset: () => set({ ...initialTrackingState }),
}));
