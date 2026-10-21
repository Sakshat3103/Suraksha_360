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
  // The exact moment (ISO timestamp) each alert FIRST crossed its
  // threshold — this is the real "at what time was it triggered" record,
  // not just a yes/no flag. Null until it has actually happened once.
  routeDeviationAlertAt: string | null;
  abnormalStopAlertAt: string | null;
  // A short human-readable detail captured at the moment each alert first
  // fired (e.g. "187m off route", "stationary for 6 min") — frozen at
  // trigger time, not live-updating, so a retrieved journey shows what was
  // true when the alert actually happened.
  routeDeviationDetail: string | null;
  abnormalStopDetail: string | null;
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
  const [routeDeviationAlertAt, setRouteDeviationAlertAt] = React.useState<string | null>(null);
  const [abnormalStopAlertAt, setAbnormalStopAlertAt] = React.useState<string | null>(null);
  const [routeDeviationDetail, setRouteDeviationDetail] = React.useState<string | null>(null);
  const [abnormalStopDetail, setAbnormalStopDetail] = React.useState<string | null>(null);

  const stoppedSinceRef = React.useRef<{ anchor: GeoPoint; since: number } | null>(null);

  React.useEffect(() => {
    if (active) {
      enableLive();
    } else {
      disableLive();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting tracking state between journeys
      setRouteDeviationMeters(0);
      setUnexpectedStopSeconds(0);
      setRouteDeviationAlertAt(null);
      setAbnormalStopAlertAt(null);
      setRouteDeviationDetail(null);
      setAbnormalStopDetail(null);
      stoppedSinceRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  React.useEffect(() => {
    if (!active || !position) return;

    const deviation = distanceToPathMeters(position, path);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing to a fresh GPS fix from the browser's geolocation API, an external system
    setRouteDeviationMeters(deviation);
    if (deviation >= deviationAlertMeters) {
      setRouteDeviationAlertAt((prev) => prev ?? new Date().toISOString());
      setRouteDeviationDetail((prev) => prev ?? `${Math.round(deviation)}m off the planned route`);
    }

    const stopped = stoppedSinceRef.current;
    if (!stopped || haversineMeters(position, stopped.anchor) > STOPPED_RADIUS_METERS) {
      stoppedSinceRef.current = { anchor: position, since: Date.now() };
      setUnexpectedStopSeconds(0);
    } else {
      const seconds = Math.round((Date.now() - stopped.since) / 1000);
      setUnexpectedStopSeconds(seconds);
      if (seconds >= stopAlertSeconds) {
        setAbnormalStopAlertAt((prev) => prev ?? new Date().toISOString());
        setAbnormalStopDetail((prev) => prev ?? `stationary for ${Math.round(seconds / 60)} min`);
      }
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
      if (seconds >= stopAlertSeconds) {
        setAbnormalStopAlertAt((prev) => prev ?? new Date().toISOString());
        setAbnormalStopDetail((prev) => prev ?? `stationary for ${Math.round(seconds / 60)} min`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [active, stopAlertSeconds]);

  return {
    position,
    isLive,
    routeDeviationMeters,
    unexpectedStopSeconds,
    hadRouteDeviationAlert: routeDeviationAlertAt !== null,
    hadAbnormalStopAlert: abnormalStopAlertAt !== null,
    routeDeviationAlertAt,
    abnormalStopAlertAt,
    routeDeviationDetail,
    abnormalStopDetail,
  };
}
