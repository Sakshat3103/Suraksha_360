"""
Generates simulated GPS trajectories along real road-network routes, with
injected route-deviation and abnormal-stop anomalies plus benign look-alikes,
for offline detector evaluation.

This is SIMULATED data. It is useful for comparing detector designs against
each other under controlled, labelled conditions. It is not a substitute for
real-world field testing.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

import requests

OSRM_BASE = "https://router.project-osrm.org/route/v1/foot"

# A spread of real origin/destination pairs across a few Indian cities, so
# routes vary in length, road density and urban/suburban character rather
# than all being one corridor.
SAMPLE_OD_PAIRS = [
    (26.8467, 75.5680, 26.9124, 75.7873, "Jaipur: Sodala -> Malviya Nagar"),
    (26.9196, 75.7217, 26.8183, 75.5607, "Jaipur: Vaishali Nagar -> Bagru Rd"),
    (28.6139, 77.2090, 28.5706, 77.3272, "Delhi: Connaught Place -> Noida border"),
    (19.0760, 72.8777, 19.1197, 72.9050, "Mumbai: Fort -> Chembur"),
    (12.9716, 77.5946, 12.9345, 77.6101, "Bengaluru: Majestic -> Koramangala"),
    (22.5726, 88.3639, 22.5958, 88.4328, "Kolkata: BBD Bagh -> Salt Lake"),
    (17.3850, 78.4867, 17.4239, 78.4738, "Hyderabad: Charminar -> Banjara Hills"),
    (13.0827, 80.2707, 13.0569, 80.2425, "Chennai: Parrys -> T. Nagar"),
]

M_PER_DEG_LAT = 111_320.0

ROUTE_DEVIATION = "route-deviation"
ABNORMAL_STOP = "abnormal-stop"
BENIGN_LANE_EXCURSION = "benign-lane-excursion"
BENIGN_SIGNAL_STOP = "benign-signal-stop"
BENIGN_DESTINATION_STOP = "benign-destination-stop"
ANOMALY_KINDS = {ROUTE_DEVIATION, ABNORMAL_STOP}


def m_per_deg_lng(lat_deg: float) -> float:
    return 111_320.0 * math.cos(math.radians(lat_deg))


def haversine_m(a, b) -> float:
    lat1, lng1 = math.radians(a[0]), math.radians(a[1])
    lat2, lng2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * 6371000.0 * math.asin(math.sqrt(h))


def fetch_osrm_route(o_lat, o_lng, d_lat, d_lng, timeout=15):
    """Real road-network route via the public OSRM demo server (same one the
    app uses). Returns a list of (lat, lng) waypoints."""
    url = f"{OSRM_BASE}/{o_lng},{o_lat};{d_lng},{d_lat}"
    params = {"overview": "full", "geometries": "geojson"}
    r = requests.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(f"OSRM returned no route: {data.get('code')}")
    coords = data["routes"][0]["geometry"]["coordinates"]  # [lng, lat] pairs
    return [(c[1], c[0]) for c in coords]


def densify(path, step_m=8.0):
    """Insert intermediate points along each segment so consecutive points
    are roughly step_m apart, for a smooth ~1Hz walking trace."""
    if len(path) < 2:
        return list(path)
    out = [path[0]]
    for a, b in zip(path, path[1:]):
        d = haversine_m(a, b)
        if d <= step_m:
            out.append(b)
            continue
        n = max(1, int(d // step_m))
        for i in range(1, n + 1):
            t = i / n
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


@dataclass
class LabeledEvent:
    kind: str
    start_idx: int
    end_idx: int
    is_anomaly: bool


@dataclass
class SimulatedTrajectory:
    route_label: str
    planned_path: list
    fixes: list  # list of dicts: lat, lng, accuracy, t (seconds)
    events: list = field(default_factory=list)


def _offset_point(p, bearing_deg, dist_m):
    lat, lng = p
    dlat = (dist_m * math.cos(math.radians(bearing_deg))) / M_PER_DEG_LAT
    dlng = (dist_m * math.sin(math.radians(bearing_deg))) / m_per_deg_lng(lat)
    return (lat + dlat, lng + dlng)


def generate_trajectory(
    origin_lat, origin_lng, dest_lat, dest_lng, label,
    rng: random.Random,
    walking_speed_mps=1.3,
    gps_noise_std_m=6.0,
    gps_noise_correlation=0.85,
) -> SimulatedTrajectory:
    raw_path = fetch_osrm_route(origin_lat, origin_lng, dest_lat, dest_lng)
    dense_path = densify(raw_path, step_m=walking_speed_mps)
    n = len(dense_path)

    # Pick 2-4 non-overlapping windows along the route, each assigned one
    # event kind up front (deviation, stop, or a benign look-alike), so
    # labelling never has to be reconstructed after the fact.
    n_events = rng.randint(2, 4)
    min_gap = max(20, n // (n_events + 2))
    starts = []
    attempt = 0
    while len(starts) < n_events and attempt < 200:
        attempt += 1
        cand = rng.randint(15, max(16, n - 15))
        if all(abs(cand - s) > min_gap for s in starts):
            starts.append(cand)
    starts.sort()

    kind_pool = [ROUTE_DEVIATION, ABNORMAL_STOP, BENIGN_LANE_EXCURSION, BENIGN_SIGNAL_STOP, BENIGN_DESTINATION_STOP]
    rng.shuffle(kind_pool)
    windows = []  # list of dicts: start_idx, kind, duration_steps, offset_m / bearing
    for idx, start in enumerate(starts):
        kind = kind_pool[idx % len(kind_pool)]
        if kind == ROUTE_DEVIATION:
            windows.append({"start": start, "kind": kind, "duration": rng.randint(10, 16),
                             "offset_m": rng.uniform(180, 400), "bearing": rng.uniform(0, 360)})
        elif kind == BENIGN_LANE_EXCURSION:
            windows.append({"start": start, "kind": kind, "duration": rng.randint(6, 12),
                             "offset_m": rng.uniform(10, 29), "bearing": rng.uniform(0, 360)})
        elif kind == ABNORMAL_STOP:
            windows.append({"start": start, "kind": kind, "duration": rng.randint(260, 600)})
        elif kind == BENIGN_SIGNAL_STOP:
            windows.append({"start": start, "kind": kind, "duration": rng.randint(15, 45)})
        elif kind == BENIGN_DESTINATION_STOP:
            windows.append({"start": start, "kind": kind, "duration": rng.randint(30, 90)})

    fixes = []
    events = []
    active = None

    # Real GPS error is temporally correlated, not an independent random
    # jump every second (the device's position estimate drifts smoothly as
    # multipath/atmospheric conditions change) — modelled here as an AR(1)
    # process: small per-second innovation, but able to wander by up to
    # roughly gps_noise_std_m over tens of seconds, matching realistic
    # device behaviour instead of teleporting the fix every tick.
    innovation_std = gps_noise_std_m * math.sqrt(max(1e-6, 1 - gps_noise_correlation ** 2))
    bias_x_m, bias_y_m = 0.0, 0.0  # the currently-open window dict, plus runtime state
    next_window_idx = 0

    for i in range(n):
        base_lat, base_lng = dense_path[i]

        if active is None and next_window_idx < len(windows) and windows[next_window_idx]["start"] == i:
            w = windows[next_window_idx]
            active = dict(w)
            active["remaining"] = w["duration"]
            active["fix_start_idx"] = len(fixes)
            if w["kind"] in (ABNORMAL_STOP, BENIGN_SIGNAL_STOP, BENIGN_DESTINATION_STOP):
                active["anchor"] = (base_lat, base_lng)
            next_window_idx += 1

        if active is not None and active["kind"] in (ABNORMAL_STOP, BENIGN_SIGNAL_STOP, BENIGN_DESTINATION_STOP):
            lat, lng = active["anchor"]
        elif active is not None and active["kind"] in (ROUTE_DEVIATION, BENIGN_LANE_EXCURSION):
            lat, lng = _offset_point((base_lat, base_lng), active["bearing"], active["offset_m"])
        else:
            lat, lng = base_lat, base_lng

        accuracy = max(3.0, rng.gauss(10, 6) if rng.random() > 0.15 else rng.gauss(35, 12))
        # AR(1)-correlated 2D GPS error: small step-to-step change, bounded
        # long-run magnitude (~gps_noise_std_m). This is what lets a
        # stationary user's consecutive fixes mostly stay close together
        # second-to-second, instead of each fix independently teleporting
        # within a noise disk and perpetually resetting the stop timer.
        bias_x_m = gps_noise_correlation * bias_x_m + rng.gauss(0, innovation_std)
        bias_y_m = gps_noise_correlation * bias_y_m + rng.gauss(0, innovation_std)
        dlat = bias_y_m / M_PER_DEG_LAT
        dlng = bias_x_m / m_per_deg_lng(lat)
        lat, lng = lat + dlat, lng + dlng

        fixes.append({"lat": lat, "lng": lng, "accuracy": accuracy, "t": i})

        if active is not None:
            active["remaining"] -= 1
            if active["kind"] in (ABNORMAL_STOP, BENIGN_SIGNAL_STOP, BENIGN_DESTINATION_STOP):
                # duration is already in seconds for stop windows; one fix == one second here
                active["remaining"] -= 0  # (decremented above already counts this second)
            if active["remaining"] <= 0:
                events.append(LabeledEvent(
                    kind=active["kind"],
                    start_idx=active["fix_start_idx"],
                    end_idx=len(fixes) - 1,
                    is_anomaly=active["kind"] in ANOMALY_KINDS,
                ))
                active = None

    if active is not None:
        events.append(LabeledEvent(
            kind=active["kind"], start_idx=active["fix_start_idx"], end_idx=len(fixes) - 1,
            is_anomaly=active["kind"] in ANOMALY_KINDS,
        ))

    return SimulatedTrajectory(route_label=label, planned_path=raw_path, fixes=fixes, events=events)


def generate_corpus(n_routes: int, seed: int = 7):
    rng = random.Random(seed)
    pairs = (SAMPLE_OD_PAIRS * (n_routes // len(SAMPLE_OD_PAIRS) + 1))[:n_routes]
    corpus = []
    for (olat, olng, dlat, dlng, label) in pairs:
        try:
            traj = generate_trajectory(olat, olng, dlat, dlng, label, rng)
            corpus.append(traj)
        except Exception as e:  # noqa: BLE001 - network/OSRM hiccup; skip and continue
            print(f"[skip] {label}: {e}")
    return corpus
