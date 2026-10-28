"use client";

import * as React from "react";
import { AlertOctagon, History, MapPinned, ShieldAlert, TimerReset } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useJourneyStore, selectEmergencyJourneys, type CompletedJourney } from "@/store/use-journey-store";
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

const EVENT_LABEL: Record<string, string> = {
  "route-deviation": "Route deviation",
  "abnormal-stop": "Abnormal stop",
  escalated: "SOS escalated",
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
  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function EventIcon({ type }: { type: string }) {
  if (type === "route-deviation") return <MapPinned className="size-3.5" />;
  if (type === "abnormal-stop") return <TimerReset className="size-3.5" />;
  return <AlertOctagon className="size-3.5" />;
}

// A summary table of every stored journey (synced from Supabase via
// useJourneyStore, see journey-history-service.ts), one row per journey.
// Clicking a row opens a dialog with the full detail: every emergency
// event and the exact timestamp it fired, not just the summary badges the
// table row has room for.
export default function JourneysPage() {
  const history = useJourneyStore((s) => s.history);
  const { t, locale } = useT();
  const [emergencyOnly, setEmergencyOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<CompletedJourney | null>(null);

  const emergencyJourneys = React.useMemo(() => selectEmergencyJourneys(history), [history]);
  const visible = emergencyOnly ? emergencyJourneys : history;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("dashboard.recentJourneys")}</h2>
          <p className="text-sm text-muted-foreground">
            Every completed journey, synced from your account. Click a row for full detail.
          </p>
        </div>
        {emergencyJourneys.length > 0 && (
          <Button
            variant={emergencyOnly ? "destructive" : "outline"}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setEmergencyOnly((v) => !v)}
          >
            <ShieldAlert className="size-3.5" />
            {emergencyOnly ? "All journeys" : `Emergency journeys (${emergencyJourneys.length})`}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Distance</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Events</th>
                    <th className="px-4 py-3 text-right font-medium">Safety score</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((j) => (
                    <tr
                      key={j.id}
                      onClick={() => setSelected(j)}
                      className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-foreground/[0.04]"
                    >
                      <td className="px-4 py-3.5 font-medium">
                        <span className="flex items-center gap-1.5">
                          {j.destination}
                          {j.wasEscalated && <AlertOctagon className="size-3.5 text-destructive" />}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {MODE_LABEL_KEY[j.mode] ? t(MODE_LABEL_KEY[j.mode]) : j.mode}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{j.distanceText}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{formatWhen(j.completedAt, locale)}</td>
                      <td className="px-4 py-3.5">
                        {j.emergencyEvents.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                            {j.emergencyEvents.length} event{j.emergencyEvents.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={cn(
                            "font-semibold",
                            j.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300"
                          )}
                        >
                          {j.safetyScore}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-1.5">
                  {selected.destination}
                  {selected.wasEscalated && <AlertOctagon className="size-4 text-destructive" />}
                </DialogTitle>
                <DialogDescription>
                  {MODE_LABEL_KEY[selected.mode] ? t(MODE_LABEL_KEY[selected.mode]) : selected.mode} ·{" "}
                  {selected.distanceText} · Completed {formatWhen(selected.completedAt, locale)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] px-4 py-3">
                <span className="text-sm text-muted-foreground">Safety score</span>
                <span
                  className={cn(
                    "text-lg font-semibold",
                    selected.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300"
                  )}
                >
                  {selected.safetyScore}/100
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Emergency events
                </p>
                {selected.emergencyEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No emergency events on this journey.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.emergencyEvents.map((e, i) => (
                      <div
                        key={`${e.type}-${i}`}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm",
                          e.type === "escalated"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-300"
                        )}
                      >
                        <EventIcon type={e.type} />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {EVENT_LABEL[e.type]} at {formatEventTime(e.at)}
                          </span>
                          {e.detail && <span className="text-xs opacity-80">{e.detail}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
