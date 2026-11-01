"use client";

import * as React from "react";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useJourneyTrackingStore } from "@/store/use-journey-tracking-store";
import { distanceToPathMeters, haversineMeters, type GeoPoint } from "@/lib/geo";

// A traveller is "stopped" once consecutive GPS fixes sit within this
// radius of each other — small enough to not fire on normal walking pace,
// large enough to absorb ordinary GPS jitter (a stationary phone's fix can
// drift 5-10m on its own). This is the FLOOR; see accuracyAwareStopRadius
// below for how a noisy fix widens it further.
const STOPPED_RADIUS_METERS = 20;

// How long a route-deviation breach must persist, continuously, before it
// is treated as real rather than a single noisy GPS fix — this is the
// "hysteresis" the paper's Methodology section describes. A fix is allowed
// to briefly recover below RELEASE_RATIO * threshold without resetting the
// breach timer entirely (small jitter around the boundary shouldn't force a
// full restart), but a clear recovery below that cancels it.
const DEVIATION_SUSTAIN_MS = 8000;
const DEVIATION_RELEASE_RATIO = 0.7;

// GPS accuracy-aware widening: a fix reporting poor horizontal accuracy
// (coords.accuracy, meters, 1 std-dev radius per the W3C Geolocation spec)
// should not be trusted to the same tolerance as a precise one, or ordinary
// GPS drift on a bad signal will read as a route deviation / phantom stop.
// Each meter of reported accuracy beyond a clean 10m fix relaxes the
// threshold by this fraction of a meter, capped so a single wildly
// inaccurate fix can't disable detection entirely.
const ACCURACY_BASELINE_METERS = 10;
const ACCURACY_WEIGHT = 0.6;
const MAX_ACCURACY_WIDENING_METERS = 120;

function accuracyWidening(accuracyMeters: number | undefined): number {
  if (accuracyMeters === undefined || !Number.isFinite(accuracyMeters) || accuracyMeters <= ACCURACY_BASELINE_METERS) {
    return 0;
  }
  return Math.min(MAX_ACCURACY_WIDENING_METERS, (accuracyMeters - ACCURACY_BASELINE_METERS) * ACCURACY_WEIGHT);
}

export interface JourneyTrackingResult {
  position: GeoPoint | null;
  isLive: boolean;
  // Real-time distance (meters) between the traveller's live GPS fix and
  // the nearest point on the planned route polyline — 0 while exactly on
  // the route or before the first live fix arrives.
  routeDeviationMeters: number;
  // Seconds the traveller has stayed within the (accuracy-widened) stopped
  // radius of the same spot, resetting the moment they move past it again.
  unexpectedStopSeconds: number;
  // Latches true the moment either anomaly is CONFIRMED (sustained past
  // hysteresis, accuracy-aware threshold), and stays true for the rest of
  // the journey — so a journey that briefly deviated and recovered is still
  // retrievable afterwards as one that had a deviation alert, not only
  // while it was actively happening.
  hadRouteDeviationAlert: boolean;
  hadAbnormalStopAlert: boolean;
  // The exact moment (ISO timestamp) each alert was CONFIRMED — this is the
  // real "at what time was it triggered" record, not just a yes/no flag.
  // Null until it has actually happened once.
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

  // All deviation/stop detection progress lives in a global store, not
  // local useState/useRef — see use-journey-tracking-store.ts for why.
  // This means navigating to another page and back during an active
  // journey resumes detection exactly where it left off, in real time,
  // instead of silently restarting an in-progress breach or stop timer.
  const routeDeviationMeters = useJourneyTrackingStore((s) => s.routeDeviationMeters);
  const unexpectedStopSeconds = useJourneyTrackingStore((s) => s.unexpectedStopSeconds);
  const routeDeviationAlertAt = useJourneyTrackingStore((s) => s.routeDeviationAlertAt);
  const abnormalStopAlertAt = useJourneyTrackingStore((s) => s.abnormalStopAlertAt);
  const routeDeviationDetail = useJourneyTrackingStore((s) => s.routeDeviationDetail);
  const abnormalStopDetail = useJourneyTrackingStore((s) => s.abnormalStopDetail);

  React.useEffect(() => {
    if (active) {
      enableLive();
    } else {
      disableLive();
      useJourneyTrackingStore.getState().reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  React.useEffect(() => {
    if (!active || !position) return;
    const store = useJourneyTrackingStore.getState();

    const deviation = distanceToPathMeters(position, path);
    store.setRouteDeviationMeters(deviation);

    const effectiveDeviationThreshold = deviationAlertMeters + accuracyWidening(position.accuracy);
    const now = Date.now();

    let breach = store.deviationBreach;
    if (deviation >= effectiveDeviationThreshold) {
      if (!breach) {
        breach = { since: now, thresholdAtBreach: effectiveDeviationThreshold };
        store.setDeviationBreach(breach);
      }
      const sustainedMs = now - breach.since;
      if (sustainedMs >= DEVIATION_SUSTAIN_MS) {
        store.confirmRouteDeviationAlert(
          new Date(breach.since).toISOString(),
          `${Math.round(deviation)}m off the planned route for ${Math.round(sustainedMs / 1000)}s`
        );
      }
    } else if (breach && deviation < breach.thresholdAtBreach * DEVIATION_RELEASE_RATIO) {
      // Clear recovery — well below the threshold that was active when the
      // breach started, not just noisy hovering near the line — cancels an
      // unconfirmed breach so it must sustain again from scratch.
      store.setDeviationBreach(null);
    }

    const stoppedRadius = STOPPED_RADIUS_METERS + accuracyWidening(position.accuracy);
    const stopped = store.stoppedSince;
    if (!stopped || haversineMeters(position, stopped.anchor) > stoppedRadius) {
      store.setStoppedSince({ anchor: position, since: now });
      store.setUnexpectedStopSeconds(0);
    } else {
      const seconds = Math.round((now - stopped.since) / 1000);
      store.setUnexpectedStopSeconds(seconds);
      if (seconds >= stopAlertSeconds) {
        store.confirmAbnormalStopAlert(
          new Date(stopped.since).toISOString(),
          `stationary for ${Math.round(seconds / 60)} min`
        );
      }
    }
  }, [position, active, path, deviationAlertMeters, stopAlertSeconds]);

  // Unexpected-stop seconds should keep climbing even between GPS fixes
  // (watchPosition only fires on a new reading, which can be many seconds
  // apart while stationary) — a 1s ticker keeps the figure live rather than
  // frozen at whatever the last fix happened to read. It also re-checks any
  // in-progress route-deviation breach against the sustain window, so an
  // alert still confirms on schedule even without a brand-new GPS fix
  // arriving right at the DEVIATION_SUSTAIN_MS mark. Reading current state
  // via getState() (not a dependency) on every tick means this stays
  // correct even if the component mounted mid-breach after a navigation.
  React.useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const store = useJourneyTrackingStore.getState();

      const stopped = store.stoppedSince;
      if (stopped) {
        const seconds = Math.round((Date.now() - stopped.since) / 1000);
        store.setUnexpectedStopSeconds(seconds);
        if (seconds >= stopAlertSeconds) {
          store.confirmAbnormalStopAlert(
            new Date(stopped.since).toISOString(),
            `stationary for ${Math.round(seconds / 60)} min`
          );
        }
      }

      const breach = store.deviationBreach;
      if (breach) {
        const sustainedMs = Date.now() - breach.since;
        if (sustainedMs >= DEVIATION_SUSTAIN_MS) {
          store.confirmRouteDeviationAlert(
            new Date(breach.since).toISOString(),
            `off the planned route for ${Math.round(sustainedMs / 1000)}s`
          );
        }
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
