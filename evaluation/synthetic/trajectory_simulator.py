"""
trajectory_simulator.py
------------------------
Walks a simulated GPS-equipped traveller along a planned route (from
route_generator.py) at 1 Hz, injecting one of four labelled scenarios per
journey:

  - "normal"            : follows the route faithfully to the end, no event.
  - "route_deviation"    : at a random point, leaves the route for a sustained
                           period (50-400m lateral offset, as specified in
                           the paper's dataset description) before either
                           rejoining or ending off-route.
  - "abnormal_stop"      : stops completely (near-zero speed) for 60-600s at
                           a point that is not the destination and not a
                           "safe place".
  - "benign_lookalike"   : contains a short, non-anomalous stop (15-45s,
                           e.g. a red light) and/or a small lane-scale
                           excursion (<30m) that should NOT trigger an
                           alert in a well-tuned detector. Used to measure
                           false alarms.

Every fix is perturbed with Gaussian GPS noise (5-20m std-dev, matching the
paper's stated dataset composition) and tagged with a synthetic "accuracy"
value, mirroring the accuracy field a real Geolocation API fix carries.
"""

import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from route_generator import RouteSpec, _meters_to_latlng_offset

WALK_SPEED_MPS = 1.35   # average pedestrian speed
SAMPLE_HZ = 1.0


@dataclass
class Fix:
    t: float            # seconds since journey start
    lat: float
    lng: float
    accuracy_m: float   # simulated GPS accuracy (1-sigma, metres)
    speed_mps: float    # ground-truth speed used to generate this fix


@dataclass
class LabelledEvent:
    kind: str            # "route_deviation" | "abnormal_stop"
    start_t: float
    end_t: float


@dataclass
class SimulatedJourney:
    route: RouteSpec
    scenario: str
    fixes: List[Fix]
    events: List[LabelledEvent] = field(default_factory=list)


def _interpolate_route(route: RouteSpec, dist_along_m: float) -> Tuple[Tuple[float, float], float]:
    """Return (lat,lng) at the given distance along the route polyline, and
    the heading (degrees) of the segment it falls on."""
    remaining = dist_along_m
    wps = route.waypoints
    for i in range(len(wps) - 1):
        lat1, lng1 = wps[i]
        lat2, lng2 = wps[i + 1]
        m_lat = 111_320.0
        m_lng = 111_320.0 * math.cos(math.radians(lat1))
        dx = (lng2 - lng1) * m_lng
        dy = (lat2 - lat1) * m_lat
        seg_len = math.hypot(dx, dy)
        if remaining <= seg_len or i == len(wps) - 2:
            t = 0.0 if seg_len < 1e-6 else min(1.0, max(0.0, remaining / seg_len))
            lat = lat1 + t * (lat2 - lat1)
            lng = lng1 + t * (lng2 - lng1)
            heading = math.degrees(math.atan2(dx, dy))
            return (lat, lng), heading
        remaining -= seg_len
    return wps[-1], 0.0


def simulate_journey(route: RouteSpec, scenario: str, rng: random.Random,
                      noise_std_range=(5.0, 20.0)) -> SimulatedJourney:
    total_len = route.total_length_m
    duration_s = total_len / WALK_SPEED_MPS
    n_fixes = int(duration_s * SAMPLE_HZ)

    fixes: List[Fix] = []
    events: List[LabelledEvent] = []

    # Decide event window(s) for anomaly scenarios
    dev_start_frac = rng.uniform(0.25, 0.55)
    dev_offset_m = rng.uniform(50, 400)
    dev_duration_s = rng.uniform(90, 240)

    stop_start_frac = rng.uniform(0.3, 0.7)
    stop_duration_s = rng.uniform(60, 600)

    benign_stop_start_frac = rng.uniform(0.2, 0.8)
    benign_stop_duration_s = rng.uniform(15, 45)
    benign_excursion_frac = rng.uniform(0.2, 0.8)
    benign_excursion_m = rng.uniform(5, 29)

    dist_along = 0.0
    t = 0.0
    in_dev = False
    dev_perp_sign = rng.choice([-1, 1])
    dev_event_start = None
    stop_event_start = None
    frozen_pos = None

    while t < duration_s:
        frac = dist_along / total_len if total_len > 0 else 1.0
        base_pos, heading = _interpolate_route(route, min(dist_along, total_len))
        lat, lng = base_pos
        true_speed = WALK_SPEED_MPS

        # --- scenario-specific ground-truth perturbation ---
        if scenario == "route_deviation" and dev_start_frac <= frac < dev_start_frac + (dev_duration_s / duration_s):
            if not in_dev:
                in_dev = True
                dev_event_start = t
            # offset perpendicular to heading by dev_offset_m (ramped in/out)
            local_t = (t - dev_event_start) / dev_duration_s
            ramp = min(1.0, local_t * 4) if local_t < 0.25 else (
                min(1.0, (1 - local_t) * 4) if local_t > 0.75 else 1.0)
            perp_m = dev_perp_sign * dev_offset_m * ramp
            dx = perp_m * math.cos(math.radians(heading))
            dy = -perp_m * math.sin(math.radians(heading))
            dlat, dlng = _meters_to_latlng_offset(lat, dx, dy)
            lat += dlat
            lng += dlng
            true_speed = WALK_SPEED_MPS
        elif in_dev:
            in_dev = False
            events.append(LabelledEvent("route_deviation", dev_event_start, t))

        if scenario == "abnormal_stop" and stop_start_frac <= frac:
            if stop_event_start is None:
                stop_event_start = t
                frozen_pos = (lat, lng)
            if t - stop_event_start < stop_duration_s:
                lat, lng = frozen_pos
                true_speed = 0.0
            else:
                if events and events[-1].kind == "abnormal_stop" and events[-1].end_t is None:
                    pass
                if not any(e.kind == "abnormal_stop" for e in events):
                    events.append(LabelledEvent("abnormal_stop", stop_event_start, t))
                dist_along += true_speed / SAMPLE_HZ

        if scenario == "benign_lookalike":
            if benign_stop_start_frac <= frac < benign_stop_start_frac + 0.02:
                # short benign stop window (red light etc.) - not labelled as an event
                true_speed = 0.0
            elif benign_excursion_frac <= frac < benign_excursion_frac + 0.02:
                dx = benign_excursion_m * math.cos(math.radians(heading))
                dy = -benign_excursion_m * math.sin(math.radians(heading))
                dlat, dlng = _meters_to_latlng_offset(lat, dx, dy)
                lat += dlat
                lng += dlng

        # GPS noise
        noise_std = rng.uniform(*noise_std_range)
        ang = rng.uniform(0, 2 * math.pi)
        r = abs(rng.gauss(0, noise_std))
        dlat_n, dlng_n = _meters_to_latlng_offset(lat, r * math.cos(ang), r * math.sin(ang))
        noisy_lat = lat + dlat_n
        noisy_lng = lng + dlng_n
        acc = max(3.0, rng.gauss(noise_std * 1.3, 3.0))

        fixes.append(Fix(t=t, lat=noisy_lat, lng=noisy_lng, accuracy_m=acc, speed_mps=true_speed))

        if scenario == "abnormal_stop" and stop_event_start is not None and (t - stop_event_start) < stop_duration_s:
            pass  # position frozen, do not advance dist_along
        else:
            dist_along += true_speed / SAMPLE_HZ

        t += 1.0 / SAMPLE_HZ

    if in_dev and dev_event_start is not None:
        events.append(LabelledEvent("route_deviation", dev_event_start, t))
    if scenario == "abnormal_stop" and stop_event_start is not None and not any(e.kind == "abnormal_stop" for e in events):
        events.append(LabelledEvent("abnormal_stop", stop_event_start, t))

    return SimulatedJourney(route=route, scenario=scenario, fixes=fixes, events=events)


def generate_dataset(routes, n_per_scenario: int, seed: int = 7) -> List[SimulatedJourney]:
    rng = random.Random(seed)
    scenarios = ["normal", "route_deviation", "abnormal_stop", "benign_lookalike"]
    journeys = []
    for scen in scenarios:
        for i in range(n_per_scenario):
            route = rng.choice(routes)
            journeys.append(simulate_journey(route, scen, rng))
    rng.shuffle(journeys)
    return journeys


if __name__ == "__main__":
    from route_generator import generate_route_corpus
    routes = generate_route_corpus(10)
    ds = generate_dataset(routes, 5)
    for j in ds[:5]:
        print(j.scenario, len(j.fixes), "fixes,", len(j.events), "labelled events")
