// Free, keyless geocoding + routing helpers.
// Search & reverse geocoding: OpenStreetMap Nominatim (nominatim.openstreetmap.org)
// Routing: the public OSRM demo server (router.project-osrm.org)
// Neither requires an API key, a Google Cloud project, or billing.

// Every network call here hits a public, free third-party service
// (Nominatim / Overpass / OSRM) with no SLA — if one of them is slow or
// unreachable, a plain fetch() hangs forever and the UI (e.g. "Searching…")
// never resolves. This wraps fetch with a hard timeout so callers always
// get an answer, even if it's "no result", within a bounded time.
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

async function nominatimSearch(query: string, near: GeoPoint | undefined, bounded: boolean): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "0",
    limit: "6",
  });

  if (near) {
    const delta = 0.5; // roughly a ~55km box around the traveller
    params.set(
      "viewbox",
      [near.lng - delta, near.lat + delta, near.lng + delta, near.lat - delta].join(",")
    );
    params.set("bounded", bounded ? "1" : "0");
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    }, 6000);
  } catch (err) {
    console.error("[Suraksha debug] Nominatim search request failed (network/timeout):", err);
    return [];
  }
  if (!res.ok) {
    console.error("[Suraksha debug] Nominatim search returned HTTP", res.status, res.statusText);
    return [];
  }

  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

export async function searchPlaces(query: string, near?: GeoPoint): Promise<PlaceResult[]> {
  if (!query.trim()) return [];

  // Nominatim's "viewbox" is only a soft ranking hint unless "bounded=1" is
  // also set — without it, a globally-better text match (e.g. a place
  // literally named "Highway" in England) can outrank anything actually
  // nearby. So: search HARD-restricted to the traveller's area first: if
  // that finds nothing (a real address further away, typed on purpose),
  // fall back to an unbounded global search rather than showing nothing.
  if (near) {
    const local = await nominatimSearch(query, near, true);
    if (local.length > 0) return local;
  }
  return nominatimSearch(query, near, false);
}

export interface NearbyPlace extends PlaceResult {
  category: string;
  distanceMeters: number;
}

// Real nearby points of interest, via OpenStreetMap's free Overpass API —
// no key, no billing. Used to power a "nearby suggestions" quick-pick list
// instead of requiring the traveller to type a search every time.
export async function fetchNearbyPlaces(origin: GeoPoint, radiusMeters = 900): Promise<NearbyPlace[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"cafe|restaurant|fast_food|hospital|bank|pharmacy|bus_station|college|university|mall|marketplace"](around:${radiusMeters},${origin.lat},${origin.lng});
      node["shop"~"mall|supermarket"](around:${radiusMeters},${origin.lat},${origin.lng});
      node["railway"="station"](around:${radiusMeters},${origin.lat},${origin.lng});
    );
    out center 20;
  `;

  async function fromOverpass(): Promise<NearbyPlace[]> {
    let res: Response;
    try {
      res = await fetchWithTimeout("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain" },
      }, 6000);
    } catch (err) {
      console.error("[Suraksha debug] Overpass request failed (network/timeout):", err);
      throw err;
    }
    if (!res.ok) {
      console.error("[Suraksha debug] Overpass returned HTTP", res.status, res.statusText);
      throw new Error(`overpass-http-${res.status}`);
    }

    const data = (await res.json()) as {
      elements: Array<{
        lat: number;
        lon: number;
        tags?: Record<string, string>;
      }>;
    };

    return data.elements
      .filter((el) => el.tags?.name)
      .map((el) => {
        const tags = el.tags!;
        const category =
          tags.amenity ?? tags.shop ?? (tags.railway === "station" ? "station" : "place");
        return {
          label: tags.name!,
          lat: el.lat,
          lng: el.lon,
          category: category.replace(/_/g, " "),
          distanceMeters: haversineMeters(origin, { lat: el.lat, lng: el.lon }),
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 5);
  }

  // Overpass (live OSM POI data) and the curated Nominatim fallback run in
  // PARALLEL rather than one after the other — Overpass has sparse coverage
  // in some areas anyway, so waiting on it first before even starting the
  // fallback nearly doubled the worst-case wait for no benefit. Whichever
  // gives real results wins; Overpass is preferred when both succeed since
  // it reflects the live map rather than a fixed list.
  const [overpassResult, curatedResult] = await Promise.allSettled([
    fromOverpass(),
    fetchCuratedFallbackNearby(origin),
  ]);

  if (overpassResult.status === "rejected") {
    console.error("[Suraksha debug] Overpass fetch rejected:", overpassResult.reason);
  }
  if (curatedResult.status === "rejected") {
    console.error("[Suraksha debug] Curated fallback fetch rejected:", curatedResult.reason);
  } else if (curatedResult.value.length === 0) {
    console.error("[Suraksha debug] Curated fallback found 0 results near", origin);
  }

  const overpassPlaces = overpassResult.status === "fulfilled" ? overpassResult.value : [];
  if (overpassPlaces.length > 0) return overpassPlaces;

  return curatedResult.status === "fulfilled" ? curatedResult.value : [];
}

export type SafeZoneCategory =
  | "temple"
  | "hospital"
  | "police"
  | "store"
  | "college"
  | "hotel"
  | "metro"
  | "fuel";

export interface SafeZone extends PlaceResult {
  category: SafeZoneCategory;
  distanceMeters: number;
}

const SAFE_ZONE_QUERY_FRAGMENTS: Record<SafeZoneCategory, string> = {
  temple: `node["amenity"="place_of_worship"]["religion"="hindu"](around:__R__,__LAT__,__LNG__);`,
  hospital: `node["amenity"~"hospital|clinic"](around:__R__,__LAT__,__LNG__);`,
  police: `node["amenity"="police"](around:__R__,__LAT__,__LNG__);`,
  store: `node["shop"~"supermarket|convenience|mall"](around:__R__,__LAT__,__LNG__);`,
  college: `node["amenity"~"college|university"](around:__R__,__LAT__,__LNG__);`,
  hotel: `node["tourism"="hotel"](around:__R__,__LAT__,__LNG__);`,
  metro: `node["railway"="station"](around:__R__,__LAT__,__LNG__);node["station"="subway"](around:__R__,__LAT__,__LNG__);`,
  fuel: `node["amenity"="fuel"](around:__R__,__LAT__,__LNG__);`,
};

// Real, verified "safe zone" categories the traveller can be routed toward in
// an emergency — hospitals, police stations, temples, colleges, hotels,
// metro stations, fuel stations, and known stores/malls. Pulled live from
// OpenStreetMap's free Overpass API, so no key or partner-network setup.
// Hardcoded last-resort government safe zones for the MUJ/Bagru corridor —
// same reasoning as MUJ_AREA_FALLBACK_QUERIES above: Overpass is a free
// third-party service with no uptime guarantee, and when it's unreachable
// (as on some networks), an emergency screen should never show "nothing
// nearby" for something as critical as the nearest police station or
// hospital. Real, verified locations (Mappls listings), not invented.
const SAFE_ZONE_STATIC_FALLBACK: SafeZone[] = [
  {
    label: "Bagru Police Station",
    category: "police",
    lat: 26.831842,
    lng: 75.576674,
    distanceMeters: 0, // recomputed relative to the traveller below
  },
  {
    label: "Government Hospital, Bagru",
    category: "hospital",
    lat: 26.81519,
    lng: 75.542767,
    distanceMeters: 0,
  },
];

async function fetchSafeZonesLive(origin: GeoPoint, radiusMeters: number): Promise<SafeZone[]> {
  const body = Object.values(SAFE_ZONE_QUERY_FRAGMENTS)
    .join("\n")
    .replaceAll("__R__", String(radiusMeters))
    .replaceAll("__LAT__", String(origin.lat))
    .replaceAll("__LNG__", String(origin.lng));
  const query = `[out:json][timeout:20];(${body});out center 60;`;

  try {
    const res = await fetchWithTimeout("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
    }, 9000);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      elements: Array<{ lat: number; lon: number; tags?: Record<string, string> }>;
    };

    return data.elements
      .filter((el) => el.tags?.name)
      .map((el) => {
        const tags = el.tags!;
        let category: SafeZoneCategory = "store";
        if (tags.amenity === "place_of_worship") category = "temple";
        else if (tags.amenity === "hospital" || tags.amenity === "clinic") category = "hospital";
        else if (tags.amenity === "police") category = "police";
        else if (tags.amenity === "college" || tags.amenity === "university") category = "college";
        else if (tags.tourism === "hotel") category = "hotel";
        else if (tags.railway === "station" || tags.station === "subway") category = "metro";
        else if (tags.amenity === "fuel") category = "fuel";

        return {
          label: tags.name!,
          lat: el.lat,
          lng: el.lon,
          category,
          distanceMeters: haversineMeters(origin, { lat: el.lat, lng: el.lon }),
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  } catch (err) {
    console.error("[Suraksha debug] Overpass safe-zone request failed:", err);
    return [];
  }
}

// Ensures fetchSafeZones never returns an empty list for something as
// critical as "nearest police/hospital" purely because the live Overpass
// query failed or the network is unreachable — falls back to real, fixed
// government locations, distance-checked against the traveller's actual
// position rather than assumed nearby.
export async function fetchSafeZones(origin: GeoPoint, radiusMeters = 1500): Promise<SafeZone[]> {
  const live = await fetchSafeZonesLive(origin, radiusMeters);
  if (live.length > 0) return live;
  return SAFE_ZONE_STATIC_FALLBACK.map((z) => ({
    ...z,
    distanceMeters: haversineMeters(origin, z),
  })).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// Named landmarks near the Manipal University Jaipur / Bagru (NH48) area —
// used as a fallback when the live Overpass query above finds nothing
// (sparse OSM tagging in that stretch of Jaipur). Coordinates are looked up
// live via Nominatim (also free/keyless) rather than hardcoded, so they stay
// accurate to real OpenStreetMap data.
// Real, verifiable places around Manipal University Jaipur / Bagru (NH48),
// looked up by name (Tripadvisor/Zomato/Justdial listings) rather than
// invented. Each is geocoded live via Nominatim below so the coordinates —
// and therefore the distance shown to the traveller — are real OpenStreetMap
// data, not guesses.
const MUJ_AREA_FALLBACK_QUERIES: {
  query: string;
  category: string;
  // Hardcoded last-resort coordinates, so nearby suggestions still work even
  // when this device/network can't reach Nominatim or Overpass at all (both
  // are free third-party services with no uptime guarantee). Looked up once
  // via web search against real listings (Tripadvisor/Zomato/Justdial/Mappls)
  // rather than invented; live geocoding above is still tried FIRST and
  // preferred whenever the network allows it, since it reflects current OSM
  // data more precisely.
  fallbackCoords: GeoPoint;
}[] = [
  { query: "Hotel Highway King, Bagru, Jaipur", category: "hotel", fallbackCoords: { lat: 26.830124, lng: 75.570593 } },
  { query: "Manipal University Jaipur Main Gate", category: "campus gate", fallbackCoords: { lat: 26.8434, lng: 75.5658 } },
  { query: "Highland Cafe And Kitchen, Dahmi Kalan, Jaipur", category: "cafe", fallbackCoords: { lat: 26.8449, lng: 75.5646 } },
  { query: "STOA, Ajmer Highway, Jaipur", category: "restaurant", fallbackCoords: { lat: 26.8390, lng: 75.5605 } },
  { query: "Bagru Bus Stand, Jaipur", category: "bus stand", fallbackCoords: { lat: 26.8375, lng: 75.5460 } },
];

async function fetchCuratedFallbackNearby(origin: GeoPoint): Promise<NearbyPlace[]> {
  const results = await Promise.all(
    MUJ_AREA_FALLBACK_QUERIES.map(async ({ query, category, fallbackCoords }) => {
      // Try live geocoding first (most accurate); if the network can't reach
      // Nominatim at all, nominatimSearch already logs why and returns [].
      let best: PlaceResult | undefined;
      try {
        const matches = await searchPlaces(query, origin);
        best = matches[0];
      } catch {
        best = undefined;
      }
      if (!best) {
        // Live search failed or found nothing — use the hardcoded coordinates
        // so this suggestion still shows up rather than silently vanishing.
        best = { label: query.split(",")[0], lat: fallbackCoords.lat, lng: fallbackCoords.lng };
      }
      const distanceMeters = haversineMeters(origin, best);
      if (distanceMeters > 25000) return null; // too far to be a sane "nearby" suggestion
      return { ...best, category, distanceMeters };
    })
  );
  return results
    .filter((r): r is NearbyPlace => r !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5);
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  path: GeoPoint[];
}

const OSRM_PROFILE: Record<string, string> = {
  walking: "foot",
  bus: "driving",
  metro: "driving",
  cab: "driving",
  scooty: "driving",
  school_bus: "driving",
};

export async function fetchRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  mode: string
): Promise<RouteResult | null> {
  const profile = OSRM_PROFILE[mode] ?? "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const path: GeoPoint[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
      lat,
      lng,
    }));

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      path,
    };
  } catch {
    return null;
  }
}

export function haversineMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function googleMapsDirectionsUrl(origin: GeoPoint, destination: GeoPoint, mode: string) {
  const travelmode = mode === "walking" ? "walking" : "driving";
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
