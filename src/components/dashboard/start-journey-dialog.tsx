"use client";

import * as React from "react";
import { AlertTriangle, Loader2, LocateFixed, MapPinned, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteMapClient } from "@/components/dashboard/route-map-client";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useJourneyStore, type JourneyRoute, type TravelMode } from "@/store/use-journey-store";
import { cn } from "@/lib/utils";
import {
  fetchNearbyPlaces,
  fetchRoute,
  formatDistance,
  formatDuration,
  haversineMeters,
  searchPlaces,
  type NearbyPlace,
  type PlaceResult,
} from "@/lib/geo";

const TRAVEL_MODES: { value: TravelMode; label: string }[] = [
  { value: "walking", label: "Walking" },
  { value: "bus", label: "Bus" },
  { value: "metro", label: "Metro" },
  { value: "cab", label: "Cab" },
  { value: "scooty", label: "Scooty" },
  { value: "school_bus", label: "School bus" },
];

// Deterministic mock safety score — a placeholder for the real AI risk model
// (safe route recommendation lands in a later pass). Scores lower late at
// night and on longer routes so the UI has believable variance.
function computeMockSafetyScore(durationSeconds: number, destination: string) {
  const hour = new Date().getHours();
  const nightPenalty = hour >= 21 || hour < 5 ? 18 : hour >= 19 ? 8 : 0;
  const lengthPenalty = Math.min(20, Math.floor(durationSeconds / 300) * 3);
  const hash = Array.from(destination).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = hash % 10;
  return Math.max(38, Math.min(97, 96 - nightPenalty - lengthPenalty - variance));
}

export function StartJourneyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const startJourney = useJourneyStore((s) => s.startJourney);
  const { position: origin, isLive, isLocating, getOnce, enableLive, disableLive } = useLiveLocation();

  const [mode, setMode] = React.useState<TravelMode>("bus");
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<PlaceResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [destination, setDestination] = React.useState<PlaceResult | null>(null);
  const [computing, setComputing] = React.useState(false);
  const [route, setRoute] = React.useState<JourneyRoute | null>(null);
  const [path, setPath] = React.useState<{ lat: number; lng: number }[] | undefined>(undefined);
  const [searchError, setSearchError] = React.useState(false);
  const [nearby, setNearby] = React.useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && !origin) getOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the async nearby-places fetch below
    setNearbyLoading(true);
    (async () => {
      // fetchNearbyPlaces already bounds each of its own network calls with
      // a timeout, but this hard cutoff is a second, independent guarantee:
      // whatever happens on the network, this spinner resolves to "no
      // results" within 9s rather than spinning forever.
      const hardTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("nearby-places-timeout")), 9000)
      );
      try {
        const results = await Promise.race([fetchNearbyPlaces(origin), hardTimeout]);
        if (!cancelled) setNearby(results);
      } catch {
        if (!cancelled) setNearby([]);
      } finally {
        if (!cancelled) setNearbyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin]);

  React.useEffect(() => {
    if (!query.trim() || destination?.label === query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale suggestions as the query changes
      setSuggestions([]);
      return;
    }
    setSearching(true);
    setSearchError(false);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, origin ?? undefined);
        setSuggestions(results);
      } catch {
        setSearchError(true);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  React.useEffect(() => {
    if (!origin || !destination) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the async route fetch below
    setComputing(true);

    (async () => {
      const result = await fetchRoute(origin, { lat: destination.lat, lng: destination.lng }, mode);
      if (cancelled) return;

      const distanceMeters = result?.distanceMeters ?? haversineMeters(origin, destination) * 1.3;
      const durationSeconds =
        result?.durationSeconds ?? distanceMeters / (mode === "walking" ? 1.3 : 8);

      setPath(result?.path);
      setRoute({
        destinationLabel: destination.label,
        distanceText: formatDistance(distanceMeters),
        durationText: formatDuration(durationSeconds),
        durationSeconds,
        safetyScore: computeMockSafetyScore(durationSeconds, destination.label),
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
      });
      setComputing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, mode]);

  function handleSelectPlace(place: PlaceResult) {
    setDestination(place);
    setQuery(place.label);
    setSuggestions([]);
    setRoute(null);
    setPath(undefined);
  }

  function handleStart() {
    if (!route) return;
    startJourney(route.destinationLabel, mode, route);
    toast.success("Safe Journey started — your circle has been notified");
    onOpenChange(false);
    resetState();
  }

  function resetState() {
    setDestination(null);
    setQuery("");
    setSuggestions([]);
    setRoute(null);
    setPath(undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="size-4.5 text-brand-blue" /> Plan a Safe Journey
          </DialogTitle>
          <DialogDescription>
            Choose where you&apos;re headed — Suraksha360 scores the route before you start.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="destination">Destination</Label>
              <button
                type="button"
                onClick={() => (isLive ? disableLive() : enableLive())}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isLive
                    ? "bg-brand-emerald/15 text-brand-emerald"
                    : "bg-foreground/[0.06] text-muted-foreground hover:text-foreground"
                )}
              >
                <Radio className={cn("size-3", isLive && "animate-pulse")} />
                {isLive ? "Live GPS on" : "Enable live GPS"}
              </button>
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="destination"
                  placeholder="Search for an address, station, or landmark"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDestination(null);
                  }}
                  autoComplete="off"
                />
                {(suggestions.length > 0 || searching) && (
                  <div className="glass-strong absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl shadow-2xl">
                    {searching ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Searching…
                      </div>
                    ) : (
                      suggestions.map((s) => (
                        <button
                          key={`${s.lat}-${s.lng}`}
                          type="button"
                          onClick={() => handleSelectPlace(s)}
                          className="block w-full truncate px-3 py-2.5 text-left text-sm hover:bg-foreground/[0.08]"
                        >
                          {s.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={getOnce} disabled={isLocating}>
                {isLocating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              </Button>
            </div>
            {!origin && (
              <p className="text-xs text-muted-foreground">
                Tap the location icon to share your current position as the starting point.
              </p>
            )}
            {searchError && (
              <p className="flex items-center gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="size-3.5" /> Search is temporarily unavailable — try again in a moment.
              </p>
            )}

            {origin && !destination && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                  Nearby suggestions
                </p>
                {nearbyLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Finding places near you…
                  </div>
                ) : nearby.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {nearby.map((p) => (
                      <button
                        key={`${p.lat}-${p.lng}`}
                        type="button"
                        onClick={() => handleSelectPlace(p)}
                        className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-left text-sm hover:bg-foreground/[0.08]"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{p.label}</span>
                          <span className="text-[11px] capitalize text-muted-foreground">
                            {p.category} · {formatDistance(p.distanceMeters)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-brand-blue">Select</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No named places found nearby — try searching above instead.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Travel mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as TravelMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAVEL_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {origin && (
            <RouteMapClient
              origin={origin}
              destination={destination ? { lat: destination.lat, lng: destination.lng } : undefined}
              path={path}
            />
          )}

          {computing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Scoring your route…
            </div>
          )}

          {route && (
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-4",
                route.safetyScore >= 75
                  ? "border-brand-emerald/30 bg-brand-emerald/10"
                  : "border-amber-400/30 bg-amber-400/10"
              )}
            >
              <div>
                <p className="text-sm font-medium">
                  {route.distanceText} · {route.durationText}
                </p>
                <p className="text-xs text-muted-foreground">Estimated route to {route.destinationLabel}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    route.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300"
                  )}
                >
                  {route.safetyScore}
                  <span className="text-sm text-muted-foreground">/100</span>
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">safety score</p>
              </div>
            </div>
          )}

          <Button variant="glow" size="lg" onClick={handleStart} disabled={!route}>
            <ShieldCheck className="size-4" /> Start Safe Journey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
