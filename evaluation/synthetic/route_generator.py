"""
route_generator.py
-------------------
Generates synthetic road-network-like routes as sequences of (lat, lng)
waypoints, used as the "planned route" for a simulated journey.

IMPORTANT / HONESTY NOTE
-------------------------
This evaluation environment has no outbound access to a live routing
service (OSRM / OpenStreetMap routing API calls are blocked by the
network sandbox this was built in). So routes here are generated
synthetically: a piecewise-linear polyline with turns at pseudo-random
intervals, mimicking the *shape* of a real routed path (a sequence of
straight segments connected at turns), rather than a route pulled from
an actual OSRM server over real OpenStreetMap road geometry.

This is NOT the same as a production OSRM-derived route, and the
accompanying report must say so explicitly. If/when this is run with
real network access to OSRM, replace `generate_synthetic_route()`
below with a real OSRM `/route/v1/...` call and keep everything else
(the simulator, the detectors, the evaluation) unchanged.
"""

import math
import random
from dataclasses import dataclass
from typing import List, Tuple

EARTH_R = 6371000.0  # metres


@dataclass
class RouteSpec:
    route_id: int
    waypoints: List[Tuple[float, float]]  # (lat, lng)
    total_length_m: float


def _meters_to_latlng_offset(lat0: float, dx_m: float, dy_m: float) -> Tuple[float, float]:
    """Convert a local flat-earth (dx east, dy north) offset in metres to a
    (dlat, dlng) offset in degrees, anchored at lat0. Same convention used
    by the on-device detector (equirectangular approximation)."""
    m_lat = 111_320.0
    m_lng = 111_320.0 * math.cos(math.radians(lat0))
    dlat = dy_m / m_lat
    dlng = dx_m / m_lng if m_lng > 1e-6 else 0.0
    return dlat, dlng


def generate_synthetic_route(route_id: int, origin: Tuple[float, float],
                              target_length_m: float, rng: random.Random,
                              min_seg_m: float = 120.0, max_seg_m: float = 450.0,
                              max_turn_deg: float = 65.0) -> RouteSpec:
    """Build a piecewise-linear polyline starting at `origin`, composed of
    straight segments of length in [min_seg_m, max_seg_m], turning by up to
    +/- max_turn_deg at each vertex, until target_length_m is reached.

    This stands in for a routed polyline (what an OSRM response's
    `geometry` field would give) with no live routing access available.
    """
    lat0, lng0 = origin
    waypoints = [(lat0, lng0)]
    heading = rng.uniform(0, 360)
    cur_lat, cur_lng = lat0, lng0
    accumulated = 0.0

    while accumulated < target_length_m:
        seg_len = rng.uniform(min_seg_m, max_seg_m)
        heading += rng.uniform(-max_turn_deg, max_turn_deg)
        heading %= 360
        dx = seg_len * math.sin(math.radians(heading))
        dy = seg_len * math.cos(math.radians(heading))
        dlat, dlng = _meters_to_latlng_offset(cur_lat, dx, dy)
        cur_lat += dlat
        cur_lng += dlng
        waypoints.append((cur_lat, cur_lng))
        accumulated += seg_len

    return RouteSpec(route_id=route_id, waypoints=waypoints, total_length_m=accumulated)


def generate_route_corpus(n_routes: int, seed: int = 42,
                           length_range_m: Tuple[float, float] = (800.0, 4500.0),
                           origin_box=((12.90, 77.55), (13.05, 77.65))) -> List[RouteSpec]:
    """Generate n_routes independent synthetic routes with varied length and
    starting point, within a bounding box roughly the size of a city
    district (defaults are an arbitrary ~15km x 15km box)."""
    rng = random.Random(seed)
    (lat_min, lng_min), (lat_max, lng_max) = origin_box
    routes = []
    for i in range(n_routes):
        origin = (rng.uniform(lat_min, lat_max), rng.uniform(lng_min, lng_max))
        target_len = rng.uniform(*length_range_m)
        routes.append(generate_synthetic_route(i, origin, target_len, rng))
    return routes


if __name__ == "__main__":
    routes = generate_route_corpus(5)
    for r in routes:
        print(r.route_id, round(r.total_length_m, 1), "m,", len(r.waypoints), "waypoints")
