"""
Three detectors over a simulated GPS fix stream, mirroring the TypeScript
implementation rather than inventing new logic:

  - naive_single_fix: ports the detector as it existed BEFORE this review's
    fix (src/hooks/use-journey-tracking.ts prior to commit 3afd008) — fires
    the instant a single fix crosses threshold, no hysteresis, no accuracy
    weighting.
  - fixed_hysteresis: adds the sustain/release logic but ignores GPS
    accuracy entirely.
  - accuracy_aware_hysteresis: the REAL, currently-shipped detector
    (src/hooks/use-journey-tracking.ts as of commit 3afd008) — sustained
    breach + accuracy-widened threshold. Constants below are copied
    verbatim from that file.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

M_PER_DEG_LAT = 111_320.0

DEVIATION_ALERT_METERS = 150
STOP_ALERT_SECONDS = 240
STOPPED_RADIUS_METERS = 20

DEVIATION_SUSTAIN_S = 8  # DEVIATION_SUSTAIN_MS / 1000 in the TS source
DEVIATION_RELEASE_RATIO = 0.7

ACCURACY_BASELINE_METERS = 10
ACCURACY_WEIGHT = 0.6
MAX_ACCURACY_WIDENING_METERS = 120


def m_per_deg_lng(lat_deg: float) -> float:
    return 111_320.0 * math.cos(math.radians(lat_deg))


def haversine_m(a, b) -> float:
    lat1, lng1 = math.radians(a[0]), math.radians(a[1])
    lat2, lng2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * 6371000.0 * math.asin(math.sqrt(h))


def distance_to_path_meters(point, path) -> float:
    """Direct port of distanceToPathMeters in src/lib/geo.ts."""
    if not path:
        return 0.0
    if len(path) == 1:
        return haversine_m(point, path[0])

    lat_rad = math.radians(point[0])
    m_per_lat = M_PER_DEG_LAT
    m_per_lng = M_PER_DEG_LAT * math.cos(lat_rad)

    def to_xy(p):
        return ((p[1] - point[1]) * m_per_lng, (p[0] - point[0]) * m_per_lat)

    px = to_xy(point)  # (0, 0) by construction
    min_d = float("inf")
    for a_p, b_p in zip(path, path[1:]):
        a = to_xy(a_p)
        b = to_xy(b_p)
        abx, aby = b[0] - a[0], b[1] - a[1]
        len_sq = abx * abx + aby * aby
        t = 0.0 if len_sq == 0 else ((px[0] - a[0]) * abx + (px[1] - a[1]) * aby) / len_sq
        t = max(0.0, min(1.0, t))
        proj_x, proj_y = a[0] + t * abx, a[1] + t * aby
        d = math.hypot(px[0] - proj_x, px[1] - proj_y)
        min_d = min(min_d, d)
    return min_d


def accuracy_widening(accuracy_m):
    if accuracy_m is None or accuracy_m <= ACCURACY_BASELINE_METERS:
        return 0.0
    return min(MAX_ACCURACY_WIDENING_METERS, (accuracy_m - ACCURACY_BASELINE_METERS) * ACCURACY_WEIGHT)


@dataclass
class DetectedEvent:
    kind: str  # "route-deviation" | "abnormal-stop"
    confirmed_at_fix_idx: int
    confirmed_at_t: float


def naive_single_fix(path, fixes):
    events = []
    stopped_since = None  # (anchor, since_t)
    dev_already_fired = False
    stop_already_fired = False
    for i, fix in enumerate(fixes):
        p = (fix["lat"], fix["lng"])
        dev = distance_to_path_meters(p, path)
        if dev >= DEVIATION_ALERT_METERS and not dev_already_fired:
            events.append(DetectedEvent("route-deviation", i, fix["t"]))
            dev_already_fired = True

        if stopped_since is None or haversine_m(p, stopped_since[0]) > STOPPED_RADIUS_METERS:
            stopped_since = (p, fix["t"])
        else:
            seconds = fix["t"] - stopped_since[1]
            if seconds >= STOP_ALERT_SECONDS and not stop_already_fired:
                events.append(DetectedEvent("abnormal-stop", i, fix["t"]))
                stop_already_fired = True
    return events


def fixed_hysteresis(path, fixes):
    events = []
    stopped_since = None
    breach_since_t = None
    dev_already_fired = False
    stop_already_fired = False
    for i, fix in enumerate(fixes):
        p = (fix["lat"], fix["lng"])
        dev = distance_to_path_meters(p, path)
        threshold = DEVIATION_ALERT_METERS  # no accuracy weighting
        if dev >= threshold:
            if breach_since_t is None:
                breach_since_t = fix["t"]
            if not dev_already_fired and (fix["t"] - breach_since_t) >= DEVIATION_SUSTAIN_S:
                events.append(DetectedEvent("route-deviation", i, fix["t"]))
                dev_already_fired = True
        elif breach_since_t is not None and dev < threshold * DEVIATION_RELEASE_RATIO:
            breach_since_t = None

        if stopped_since is None or haversine_m(p, stopped_since[0]) > STOPPED_RADIUS_METERS:
            stopped_since = (p, fix["t"])
        else:
            seconds = fix["t"] - stopped_since[1]
            if seconds >= STOP_ALERT_SECONDS and not stop_already_fired:
                events.append(DetectedEvent("abnormal-stop", i, fix["t"]))
                stop_already_fired = True
    return events


def accuracy_aware_hysteresis(path, fixes):
    """The real, shipped detector (as of commit 3afd008)."""
    events = []
    stopped_since = None  # (anchor, since_t)
    breach = None  # (since_t, threshold_at_breach)
    dev_already_fired = False
    stop_already_fired = False
    for i, fix in enumerate(fixes):
        p = (fix["lat"], fix["lng"])
        dev = distance_to_path_meters(p, path)
        widen = accuracy_widening(fix.get("accuracy"))
        threshold = DEVIATION_ALERT_METERS + widen

        if dev >= threshold:
            if breach is None:
                breach = (fix["t"], threshold)
            if not dev_already_fired and (fix["t"] - breach[0]) >= DEVIATION_SUSTAIN_S:
                events.append(DetectedEvent("route-deviation", i, fix["t"]))
                dev_already_fired = True
        elif breach is not None and dev < breach[1] * DEVIATION_RELEASE_RATIO:
            breach = None

        stop_radius = STOPPED_RADIUS_METERS + widen
        if stopped_since is None or haversine_m(p, stopped_since[0]) > stop_radius:
            stopped_since = (p, fix["t"])
        else:
            seconds = fix["t"] - stopped_since[1]
            if seconds >= STOP_ALERT_SECONDS and not stop_already_fired:
                events.append(DetectedEvent("abnormal-stop", i, fix["t"]))
                stop_already_fired = True
    return events


DETECTORS = {
    "naive_single_fix": naive_single_fix,
    "fixed_hysteresis": fixed_hysteresis,
    "accuracy_aware_hysteresis": accuracy_aware_hysteresis,
}
