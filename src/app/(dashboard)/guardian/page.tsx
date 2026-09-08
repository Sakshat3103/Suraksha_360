"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Battery, Gauge, MapPin, Navigation2, Route, ShieldHalf, Siren, TimerReset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteMapClient } from "@/components/dashboard/route-map-client";
import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import { useJourneyStore } from "@/store/use-journey-store";
import { useTimelineStore } from "@/store/use-timeline-store";
import { computeSafetyScore, scoreBand } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";

export default function GuardianPage() {
  const { status, destination, route, mode } = useJourneyStore();
  const events = useTimelineStore((s) => s.events);
  const { t } = useT();
  const [battery, setBattery] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    nav.getBattery?.().then((b) => setBattery(Math.round(b.level * 100)));
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const risk = React.useMemo(() => {
    if (!route) return null;
    return computeSafetyScore({
      hour: now.getHours(),
      distanceRemainingMeters: 400,
      totalDistanceMeters: 1000,
      elapsedSeconds: 0,
      expectedDurationSeconds: route.durationSeconds,
      routeDeviationMeters: 0,
      unexpectedStopSeconds: 0,
      nearbySafeZoneCount: 1,
      nearbyPoliceOrHospital: false,
      communityReportsNearby: 0,
      isEscalated: status === "escalated",
    });
  }, [route, now, status]);

  const alerts = React.useMemo(() => events.filter((e) => e.kind === "guardian" || e.kind === "deviation" || e.kind === "stop"), [events]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("nav.guardian")}</h2>
        <p className="text-sm text-muted-foreground">{t("guardian.subtitle")}</p>
      </div>

      {status === "idle" || !route ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-white">
              <ShieldHalf className="size-6" />
            </span>
            <p className="font-medium">{t("guardian.noActiveJourney")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("guardian.noActiveJourneyDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, label: t("guardian.destination"), value: destination ?? "—" },
              { icon: Navigation2, label: t("guardian.routeStatus"), value: status === "escalated" ? t("guardian.escalatedStatus") : t("guardian.onTrack") },
              { icon: Gauge, label: t("guardian.safetyScore"), value: risk ? `${risk.score}/100` : "—" },
              { icon: Battery, label: t("guardian.battery"), value: battery !== null ? `${battery}%` : t("guardian.unavailable") },
            ].map((tile) => (
              <div key={tile.label} className="glass flex flex-col gap-2 rounded-2xl p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-foreground/[0.06] text-brand-blue">
                  <tile.icon className="size-4" />
                </span>
                <div>
                  <p className="truncate text-sm font-semibold">{tile.value}</p>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="size-4.5 text-brand-blue" /> {t("guardian.liveLocation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <RouteMapClient
                  origin={{ lat: route.originLat, lng: route.originLng }}
                  destination={{ lat: route.destinationLat, lng: route.destinationLng }}
                  height={260}
                />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <TimerReset className="size-3.5" /> {t("guardian.lastUpdated")} {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span>{t("guardian.mode")}: {mode ?? "—"}</span>
                  <span>{t("guardian.currentSpeed")}: {mode === "walking" ? "~4.5 km/h" : "~18 km/h"} (est.)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Siren className="size-4.5 text-destructive" /> {t("guardian.intelligentAlerts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("guardian.noAlerts")}</p>
                ) : (
                  alerts.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs",
                        "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {a.label}
                    </motion.div>
                  ))
                )}
                {risk && (
                  <p className={cn("mt-2 text-xs font-medium", scoreBand(risk.score).tone === "safe" ? "text-brand-emerald" : "text-amber-300")}>
                    {t("guardian.currentStatus")}: {scoreBand(risk.score).label}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <JourneyTimeline />
        </>
      )}
    </div>
  );
}
