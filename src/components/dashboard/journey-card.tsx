"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  ExternalLink,
  MapPinned,
  ShieldCheck,
  TimerReset,
  Users2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useJourneyStore } from "@/store/use-journey-store";
import { useSosStore } from "@/store/use-sos-store";
import { useTimelineStore } from "@/store/use-timeline-store";
import { useCommunityStore } from "@/store/use-community-store";
import { StartJourneyDialog } from "@/components/dashboard/start-journey-dialog";
import { RouteMapClient } from "@/components/dashboard/route-map-client";
import { SafetyScoreCard } from "@/components/dashboard/safety-score-card";
import { SafeHavenCard } from "@/components/dashboard/safe-haven-card";
import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import {
  fetchRoute,
  fetchSafeZones,
  googleMapsDirectionsUrl,
  haversineMeters,
  type GeoPoint,
  type SafeZone,
} from "@/lib/geo";
import { computeSafetyScore } from "@/lib/risk-engine";
import { computeEmergencyLevel } from "@/lib/emergency-detector";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/use-t";

function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function JourneyCard() {
  const { status, destination, route, mode, endJourney, setStatus } = useJourneyStore();
  const sosStatus = useSosStore((s) => s.status);
  const fireSos = useSosStore((s) => s.fire);
  const addTimelineEvent = useTimelineStore((s) => s.addEvent);
  const resetTimeline = useTimelineStore((s) => s.reset);
  const communityReports = useCommunityStore((s) => s.reports);
  const { t } = useT();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [remaining, setRemaining] = React.useState(0);
  const [safeZones, setSafeZones] = React.useState<SafeZone[]>([]);
  const [reroute, setReroute] = React.useState<{
    label: string;
    destination: GeoPoint;
    path?: GeoPoint[];
  } | null>(null);
  const [findingSafeZone, setFindingSafeZone] = React.useState(false);

  const prevStatusRef = React.useRef(status);
  const lastLoggedScoreRef = React.useRef<number | null>(null);
  const guardianNotifiedRef = React.useRef(false);

  React.useEffect(() => {
    if (status !== "active" || !route) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing the countdown to a freshly started journey
    setRemaining(route.durationSeconds);
    const interval = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, route]);

  React.useEffect(() => {
    if (!route || status === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale safe zones when the journey ends
      setSafeZones([]);
      return;
    }
    let cancelled = false;
    fetchSafeZones({ lat: route.originLat, lng: route.originLng }).then((zones) => {
      if (!cancelled) setSafeZones(zones);
    });
    return () => {
      cancelled = true;
    };
  }, [route, status]);

  React.useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === "idle" && status === "active" && route) {
      resetTimeline();
      addTimelineEvent(`Journey started to ${destination}`, "start");
      lastLoggedScoreRef.current = null;
      guardianNotifiedRef.current = false;
    }
    if (prev !== "idle" && status === "idle") {
      addTimelineEvent("Reached destination", "end");
    }
    prevStatusRef.current = status;
  }, [status, route, destination, addTimelineEvent, resetTimeline]);

  const totalDemoSeconds = route ? route.durationSeconds : 1;
  const progressValue = route ? Math.round(((totalDemoSeconds - remaining) / totalDemoSeconds) * 100) : 0;
  const elapsedSeconds = totalDemoSeconds - remaining;

  const communityReportsNearby = React.useMemo(() => {
    if (!route) return 0;
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional: recomputes the 7-day report window on each relevant change
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return communityReports.filter(
      (r) =>
        new Date(r.createdAt).getTime() >= cutoff &&
        haversineMeters({ lat: route.originLat, lng: route.originLng }, r) <= 1000
    ).length;
  }, [communityReports, route]);

  const riskResult = React.useMemo(() => {
    if (!route) return null;
    return computeSafetyScore({
      hour: new Date().getHours(),
      distanceRemainingMeters: (1 - progressValue / 100) * 1000,
      totalDistanceMeters: 1000,
      elapsedSeconds,
      expectedDurationSeconds: totalDemoSeconds,
      routeDeviationMeters: reroute ? 500 : 0,
      unexpectedStopSeconds: 0,
      nearbySafeZoneCount: safeZones.length,
      nearbyPoliceOrHospital: safeZones.some((z) => z.category === "police" || z.category === "hospital"),
      communityReportsNearby,
      isEscalated: status === "escalated",
    });
  }, [route, progressValue, elapsedSeconds, totalDemoSeconds, reroute, safeZones, communityReportsNearby, status]);

  React.useEffect(() => {
    if (!riskResult || status === "idle") return;
    const last = lastLoggedScoreRef.current;
    if (last === null || Math.abs(riskResult.score - last) >= 8) {
      addTimelineEvent(
        last === null ? "Initial safety score computed" : riskResult.score > last ? "Safety score improved" : "Safety score decreased",
        "risk",
        riskResult.score
      );
      lastLoggedScoreRef.current = riskResult.score;
    }

    const emergency = computeEmergencyLevel({
      unexpectedStopSeconds: 0,
      routeDeviationMeters: reroute ? 500 : 0,
      communityReportsNearby,
      isEscalated: status === "escalated",
      manualSosActive: sosStatus === "triggered" || sosStatus === "escalated",
      safetyScore: riskResult.score,
    });

    if (emergency.autoNotifyGuardian && !guardianNotifiedRef.current) {
      guardianNotifiedRef.current = true;
      addTimelineEvent(`Guardian alert sent — ${emergency.reasons[0]}`, "guardian");
      toast.error(`Emergency risk: ${emergency.level.toUpperCase()} — guardians notified automatically`);
    }
    if (!emergency.autoNotifyGuardian) {
      guardianNotifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskResult, status, sosStatus, reroute, communityReportsNearby]);

  async function handleBeingFollowed() {
    if (!route) return;
    fireSos("being-followed");
    setStatus("escalated");
    setFindingSafeZone(true);
    addTimelineEvent("Route deviation — user reported being followed", "deviation", riskResult?.score);
    toast.warning("Stopping navigation to your original destination — finding a safe place nearby");

    const origin = { lat: route.originLat, lng: route.originLng };
    const zones = safeZones.length > 0 ? safeZones : await fetchSafeZones(origin);
    const preferred =
      zones.find((z) => z.category === "police") ??
      zones.find((z) => z.category === "hospital") ??
      zones[0];

    if (preferred) {
      const routeResult = await fetchRoute(origin, preferred, mode ?? "walking");
      setReroute({ label: preferred.label, destination: preferred, path: routeResult?.path });
      addTimelineEvent(`AI recommended ${preferred.label} as a safe haven`, "recommendation");
      toast.success(`Rerouting to ${preferred.label} — your circle can see this live`);
    } else {
      toast.error("No verified safe zone found nearby — call your emergency contact directly");
    }
    setFindingSafeZone(false);
  }

  const displayDestination = reroute
    ? { lat: reroute.destination.lat, lng: reroute.destination.lng }
    : route
      ? { lat: route.destinationLat, lng: route.destinationLng }
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-brand-blue/15 blur-3xl" />
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="size-4.5 text-brand-blue" />
            {t("dashboard.safeJourney")}
          </CardTitle>
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-xs font-medium " +
              (status === "idle"
                ? "bg-white/10 text-muted-foreground"
                : status === "escalated"
                  ? "bg-destructive/15 text-destructive animate-pulse-ring"
                  : "bg-brand-emerald/15 text-brand-emerald animate-pulse-ring")
            }
          >
            {status === "idle" ? t("dashboard.notActive") : status === "escalated" ? t("dashboard.escalatedStatus") : t("dashboard.activeStatus")}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {status === "idle" ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.startJourneyDesc")}
              </p>
              <Button variant="glow" size="lg" onClick={() => setDialogOpen(true)}>
                {t("dashboard.startAJourney")}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("guardian.destination")}</span>
                <span className="max-w-[65%] truncate text-right font-medium">
                  {reroute ? `${reroute.label} (safe zone)` : destination}
                </span>
              </div>

              {reroute && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertOctagon className="size-3.5 shrink-0" />
                  {t("dashboard.rerouteNotice")}
                </div>
              )}

              {route && displayDestination && (
                <RouteMapClient
                  origin={{ lat: route.originLat, lng: route.originLng }}
                  destination={displayDestination}
                  path={reroute?.path}
                  safeZones={safeZones}
                  height={180}
                />
              )}

              {route && displayDestination && (
                <a
                  href={googleMapsDirectionsUrl(
                    { lat: route.originLat, lng: route.originLng },
                    displayDestination,
                    mode ?? "walking"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("dashboard.openInGoogleMaps")} <ExternalLink className="size-3" />
                </a>
              )}

              <div className="flex items-center gap-2 text-sm">
                <TimerReset className="size-4 text-amber-300" />
                <span className="text-muted-foreground">{t("dashboard.safetyCheckIn")}</span>
                <span className="ml-auto font-medium tabular-nums">{formatCountdown(remaining)}</span>
              </div>
              <Progress value={progressValue} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users2 className="size-3.5 text-brand-emerald" />
                {t("dashboard.guardiansWatching")}
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleBeingFollowed}
                disabled={findingSafeZone || !!reroute}
              >
                <AlertOctagon className="size-4" />
                {findingSafeZone
                  ? t("dashboard.findingSafePlace")
                  : reroute
                    ? t("dashboard.reroutedSafeZone")
                    : t("dashboard.imBeingFollowed")}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setReroute(null);
                    endJourney();
                  }}
                >
                  <ShieldCheck className="size-4" /> {t("dashboard.reachedSafely")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setReroute(null);
                    endJourney();
                  }}
                >
                  {t("dashboard.endJourney")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-6 mt-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 text-center text-xs text-muted-foreground"
          >
            {t("dashboard.doubleTapSos")}
          </motion.div>
        )}

        <StartJourneyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </Card>

      {status !== "idle" && riskResult && destination && (
        <>
          <SafetyScoreCard risk={riskResult} destination={reroute?.label ?? destination} />
          {safeZones.length > 0 && <SafeHavenCard zones={safeZones} />}
          <JourneyTimeline />
        </>
      )}
    </div>
  );
}
