"use client";

import * as React from "react";
import { useLiveLocation } from "@/hooks/use-live-location";
import { distanceToPathMeters, haversineMeters, type GeoPoint } from "@/lib/geo";

// A traveller is "stopped" once consecutive GPS fixes sit within this
// radius of each other — small enough to not fire on normal walking pace,
// large enough to absorb ordinary GPS jitter (a stationary phone's fix can
// drift 5-10m on its own).
const STOPPED_RADIUS_METERS = 20;

export interface JourneyTrackingResult {
  position: GeoPoint | null;
  isLive: boolean;
  // Real-time distance (meters) between the traveller's live GPS fix and
  // the nearest point on the planned route polyline — 0 while exactly on
  // the route or before the first live fix arrives.
  routeDeviationMeters: number;
  // Seconds the traveller has stayed within STOPPED_RADIUS_METERS of the
  // same spot, resetting the moment they move past it again.
  unexpectedStopSeconds: number;
  // Latches true the moment either anomaly crosses its alert threshold, and
  // stays true for the rest of the journey — so a journey that briefly
  // deviated and recovered is still retrievable afterwards as one that had
  // a deviation alert, not only while it was actively happening.
  hadRouteDeviationAlert: boolean;
  hadAbnormalStopAlert: boolean;
}

export function useJourneyTracking(
  active: boolean,
  path: GeoPoint[] | undefined,
  options?: { deviationAlertMeters?: number; stopAlertSeconds?: number }
): JourneyTrackingResult {
  const deviationAlertMeters = options?.deviationAlertMeters ?? 150;
  const stopAlertSeconds = options?.stopAlertSeconds ?? 240;

  const { position, isLive, enableLive, disableLive } = useLiveLocation();

  const [routeDeviationMeters, setRouteDeviationMeters] = React.useState(0);
  const [unexpectedStopSeconds, setUnexpectedStopSeconds] = React.useState(0);
  const [hadRouteDeviationAlert, setHadRouteDeviationAlert] = React.useState(false);
  const [hadAbnormalStopAlert, setHadAbnormalStopAlert] = React.useState(false);

  const stoppedSinceRef = React.useRef<{ anchor: GeoPoint; since: number } | null>(null);

  React.useEffect(() => {
    if (active) {
      enableLive();
    } else {
      disableLive();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting tracking state between journeys
      setRouteDeviationMeters(0);
      setUnexpectedStopSeconds(0);
      setHadRouteDeviationAlert(false);
      setHadAbnormalStopAlert(false);
      stoppedSinceRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  React.useEffect(() => {
    if (!active || !position) return;

    const deviation = distanceToPathMeters(position, path);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing to a fresh GPS fix from the browser's geolocation API, an external system
    setRouteDeviationMeters(deviation);
    if (deviation >= deviationAlertMeters) setHadRouteDeviationAlert(true);

    const stopped = stoppedSinceRef.current;
    if (!stopped || haversineMeters(position, stopped.anchor) > STOPPED_RADIUS_METERS) {
      stoppedSinceRef.current = { anchor: position, since: Date.now() };
      setUnexpectedStopSeconds(0);
    } else {
      const seconds = Math.round((Date.now() - stopped.since) / 1000);
      setUnexpectedStopSeconds(seconds);
      if (seconds >= stopAlertSeconds) setHadAbnormalStopAlert(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, active, path]);

  // Unexpected-stop seconds should keep climbing even between GPS fixes
  // (watchPosition only fires on a new reading, which can be many seconds
  // apart while stationary) — a 1s ticker keeps the figure live rather than
  // frozen at whatever the last fix happened to read.
  React.useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const stopped = stoppedSinceRef.current;
      if (!stopped) return;
      const seconds = Math.round((Date.now() - stopped.since) / 1000);
      setUnexpectedStopSeconds(seconds);
      if (seconds >= stopAlertSeconds) setHadAbnormalStopAlert(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, stopAlertSeconds]);

  return {
    position,
    isLive,
    routeDeviationMeters,
    unexpectedStopSeconds,
    hadRouteDeviationAlert,
    hadAbnormalStopAlert,
  };
}
