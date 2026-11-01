"""
detector.py
------------
Three route-deviation / abnormal-stop detectors evaluated head to head:

  1. NaiveDetector            - fires the instant a single fix exceeds the
                                 distance/stop threshold. No smoothing, no
                                 accuracy-awareness. This is the baseline a
                                 "first pass" implementation would ship.

  2. FixedHysteresisDetector  - requires the breach to be *sustained* for a
                                 minimum duration before firing (hysteresis),
                                 but ignores each fix's GPS accuracy field.

  3. AccuracyAwareDetector    - the detector actually implemented on-device
                                 in Suraksha 360: same sustained-breach
                                 hysteresis as (2), but the effective
                                 distance/stop threshold is widened in
                                 proportion to the fix's reported GPS
                                 accuracy, so a noisy low-accuracy fix needs
                                 a larger deviation to count as a breach.

All three share the same cross-track-distance geometry (projecting a fix
onto the nearest route segment) and the same default thresholds used in
the deployed app: 150m sustained deviation, 240s sustained stop.
"""

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple

from route_generator import RouteSpec
from trajectory_simulator import Fix

DEV_THRESHOLD_M = 150.0
STOP_THRESHOLD_S = 240.0
STOP_RADIUS_M = 20.0


def _project_to_segment(p: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Cross-track distance in metres from point p to segment a-b, using the
    same local equirectangular projection as the on-device detector."""
    lat0 = a[0]
    m_lat = 111_320.0
    m_lng = 111_320.0 * math.cos(math.radians(lat0))

    ax, ay = 0.0, 0.0
    bx, by = (b[1] - a[1]) * m_lng, (b[0] - a[0]) * m_lat
    px, py = (p[1] - a[1]) * m_lng, (p[0] - a[0]) * m_lat

    abx, aby = bx - ax, by - ay
    seg_len2 = abx * abx + aby * aby
    if seg_len2 < 1e-6:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / seg_len2))
    cx, cy = ax + t * abx, ay + t * aby
    return math.hypot(px - cx, py - cy)


def cross_track_distance(p: Tuple[float, float], route: RouteSpec) -> float:
    wps = route.waypoints
    return min(_project_to_segment(p, wps[i], wps[i + 1]) for i in range(len(wps) - 1))


@dataclass
class DetectedEvent:
    kind: str          # "route_deviation" | "abnormal_stop"
    start_t: float      # time the condition first began (ground truth onset)
    fired_t: float       # time the detector actually raised the alert
    end_t: Optional[float] = None


class _BaseDetector:
    name = "base"

    def __init__(self, dev_threshold_m=DEV_THRESHOLD_M, stop_threshold_s=STOP_THRESHOLD_S,
                 stop_radius_m=STOP_RADIUS_M, dev_sustain_s=90.0):
        self.dev_threshold_m = dev_threshold_m
        self.stop_threshold_s = stop_threshold_s
        self.stop_radius_m = stop_radius_m
        self.dev_sustain_s = dev_sustain_s

    def _effective_dev_threshold(self, fix: Fix) -> float:
        return self.dev_threshold_m

    def _effective_stop_radius(self, fix: Fix) -> float:
        return self.stop_radius_m

    def run(self, route: RouteSpec, fixes: List[Fix]) -> List[DetectedEvent]:
        raise NotImplementedError


class NaiveDetector(_BaseDetector):
    """Fires immediately on the first fix that breaches threshold. No
    sustained-breach requirement, no accuracy weighting."""
    name = "naive_single_fix"

    def run(self, route: RouteSpec, fixes: List[Fix]) -> List[DetectedEvent]:
        events: List[DetectedEvent] = []
        dev_active = False
        dev_onset = None
        stop_anchor = None
        stop_onset = None
        stop_fired = False

        for f in fixes:
            d = cross_track_distance((f.lat, f.lng), route)
            if d > self._effective_dev_threshold(f):
                if not dev_active:
                    dev_active = True
                    dev_onset = f.t
                    events.append(DetectedEvent("route_deviation", dev_onset, f.t))
            else:
                dev_active = False

            if stop_anchor is None:
                stop_anchor = (f.lat, f.lng)
                stop_onset = f.t
                stop_fired = False
            else:
                moved = _project_to_segment((f.lat, f.lng), stop_anchor, stop_anchor)
                if moved > self._effective_stop_radius(f):
                    stop_anchor = (f.lat, f.lng)
                    stop_onset = f.t
                    stop_fired = False
                elif not stop_fired:
                    stop_fired = True
                    events.append(DetectedEvent("abnormal_stop", stop_onset, f.t))
        return events


class FixedHysteresisDetector(_BaseDetector):
    """Requires the breach to persist for the full threshold duration before
    firing, but does not use per-fix GPS accuracy."""
    name = "fixed_hysteresis"

    def run(self, route: RouteSpec, fixes: List[Fix]) -> List[DetectedEvent]:
        events: List[DetectedEvent] = []
        dev_breach_start = None
        dev_fired = False
        stop_anchor = None
        stop_breach_start = None
        stop_fired = False

        for f in fixes:
            d = cross_track_distance((f.lat, f.lng), route)
            if d > self._effective_dev_threshold(f):
                if dev_breach_start is None:
                    dev_breach_start = f.t
                    dev_fired = False
                elif not dev_fired and (f.t - dev_breach_start) >= self.dev_sustain_s:
                    dev_fired = True
                    events.append(DetectedEvent("route_deviation", dev_breach_start, f.t))
            else:
                dev_breach_start = None
                dev_fired = False

            if stop_anchor is None:
                stop_anchor = (f.lat, f.lng)
                stop_breach_start = f.t
                stop_fired = False
            else:
                moved = math.hypot(0, 0) if False else _project_to_segment((f.lat, f.lng), stop_anchor, stop_anchor)
                if moved > self._effective_stop_radius(f):
                    stop_anchor = (f.lat, f.lng)
                    stop_breach_start = f.t
                    stop_fired = False
                elif not stop_fired and (f.t - stop_breach_start) >= self.stop_threshold_s:
                    stop_fired = True
                    events.append(DetectedEvent("abnormal_stop", stop_breach_start, f.t))
        return events


class AccuracyAwareDetector(_BaseDetector):
    """The production Suraksha 360 detector: sustained-breach hysteresis
    (same durations as FixedHysteresisDetector) PLUS an accuracy-aware
    threshold -- the effective deviation/stop radius widens with the fix's
    reported GPS accuracy, so a low-accuracy fix needs a bigger apparent
    deviation before it counts toward a breach."""
    name = "accuracy_aware_hysteresis"

    def __init__(self, *args, accuracy_weight: float = 0.6, **kwargs):
        super().__init__(*args, **kwargs)
        self.accuracy_weight = accuracy_weight

    def _effective_dev_threshold(self, fix: Fix) -> float:
        return self.dev_threshold_m + self.accuracy_weight * fix.accuracy_m

    def _effective_stop_radius(self, fix: Fix) -> float:
        return self.stop_radius_m + self.accuracy_weight * fix.accuracy_m

    def run(self, route: RouteSpec, fixes: List[Fix]) -> List[DetectedEvent]:
        events: List[DetectedEvent] = []
        dev_breach_start = None
        dev_fired = False
        stop_anchor = None
        stop_breach_start = None
        stop_fired = False

        for f in fixes:
            d = cross_track_distance((f.lat, f.lng), route)
            if d > self._effective_dev_threshold(f):
                if dev_breach_start is None:
                    dev_breach_start = f.t
                    dev_fired = False
                elif not dev_fired and (f.t - dev_breach_start) >= self.dev_sustain_s:
                    dev_fired = True
                    events.append(DetectedEvent("route_deviation", dev_breach_start, f.t))
            else:
                dev_breach_start = None
                dev_fired = False

            if stop_anchor is None:
                stop_anchor = (f.lat, f.lng)
                stop_breach_start = f.t
                stop_fired = False
            else:
                moved = _project_to_segment((f.lat, f.lng), stop_anchor, stop_anchor)
                if moved > self._effective_stop_radius(f):
                    stop_anchor = (f.lat, f.lng)
                    stop_breach_start = f.t
                    stop_fired = False
                elif not stop_fired and (f.t - stop_breach_start) >= self.stop_threshold_s:
                    stop_fired = True
                    events.append(DetectedEvent("abnormal_stop", stop_breach_start, f.t))
        return events


ALL_DETECTORS = {
    "naive_single_fix": NaiveDetector,
    "fixed_hysteresis": FixedHysteresisDetector,
    "accuracy_aware_hysteresis": AccuracyAwareDetector,
}
