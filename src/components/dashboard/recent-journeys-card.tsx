"use client";

import * as React from "react";
import { AlertOctagon, History, MapPinned, ShieldAlert, TimerReset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useJourneyStore, selectEmergencyJourneys } from "@/store/use-journey-store";
import { translate } from "@/lib/i18n/dictionary";
import type { LocaleCode } from "@/store/use-locale-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";

const MODE_LABEL_KEY: Record<string, string> = {
  walking: "dashboard.modeWalking",
  bus: "dashboard.modeBus",
  metro: "dashboard.modeMetro",
  cab: "dashboard.modeCab",
  scooty: "dashboard.modeScooty",
  school_bus: "dashboard.modeSchoolBus",
};

function formatWhen(iso: string, locale: LocaleCode) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `${translate("dashboard.today", locale)}, ${time}`;
  if (isYesterday) return `${translate("dashboard.yesterday", locale)}, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

const EVENT_LABEL: Record<string, string> = {
  "route-deviation": "Route deviation",
  "abnormal-stop": "Abnormal stop",
  escalated: "SOS escalated",
};

// Real completed journeys only — populated the moment a journey ends (see
// endJourney in use-journey-store), never seeded with placeholder data.
export function RecentJourneysCard() {
  const history = useJourneyStore((s) => s.history);
  const { t, locale } = useT();
  const [emergencyOnly, setEmergencyOnly] = React.useState(false);

  const emergencyJourneys = React.useMemo(() => selectEmergencyJourneys(history), [history]);
  const visible = emergencyOnly ? emergencyJourneys : history;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{t("dashboard.recentJourneys")}</CardTitle>
        {emergencyJourneys.length > 0 && (
          <Button
            variant={emergencyOnly ? "destructive" : "outline"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setEmergencyOnly((v) => !v)}
          >
            <ShieldAlert className="size-3.5" />
            {emergencyOnly ? "All journeys" : `Emergency journeys (${emergencyJourneys.length})`}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-muted-foreground">
              <History className="size-4.5" />
            </span>
            <p className="text-sm font-medium">
              {emergencyOnly ? "No emergency journeys" : t("dashboard.noJourneysYet")}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {emergencyOnly
                ? "Journeys with a route-deviation or abnormal-stop alert will show up here."
                : t("dashboard.noJourneysDesc")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/10">
            {visible.map((j) => (
              <div key={j.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {j.destination}
                    {j.wasEscalated && <AlertOctagon className="size-3.5 text-destructive" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {MODE_LABEL_KEY[j.mode] ? t(MODE_LABEL_KEY[j.mode]) : j.mode} · {j.distanceText} · {formatWhen(j.completedAt, locale)}
                  </p>
                  {j.emergencyEvents.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {j.emergencyEvents.map((e, i) => (
                        <span
                          key={`${e.type}-${i}`}
                          className={
                            "flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium " +
                            (e.type === "escalated"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-amber-500/15 text-amber-300")
                          }
                          title={`${EVENT_LABEL[e.type]} at ${formatEventTime(e.at)}${e.detail ? ` — ${e.detail}` : ""}`}
                        >
                          {e.type === "route-deviation" ? (
                            <MapPinned className="size-3" />
                          ) : e.type === "abnormal-stop" ? (
                            <TimerReset className="size-3" />
                          ) : (
                            <AlertOctagon className="size-3" />
                          )}
                          {EVENT_LABEL[e.type]} at {formatEventTime(e.at)}
                          {e.detail ? ` — ${e.detail}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    j.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300"
                  )}
                >
                  {j.safetyScore}/100
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
