"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon, History, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useJourneyStore, selectEmergencyJourneys, type CompletedJourney } from "@/store/use-journey-store";
import { JourneyDetailDialog, formatJourneyWhen } from "@/components/dashboard/journey-detail-dialog";
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

const DASHBOARD_ROW_LIMIT = 5;

// Compact on-dashboard summary table of the most recent journeys — a quick
// glance, not the full archive (that's /journeys). Clicking a row opens
// the same detail dialog used on the full page, so either entry point
// shows the exact same record: every emergency event with its timestamp.
export function RecentJourneysCard() {
  const history = useJourneyStore((s) => s.history);
  const { t, locale } = useT();
  const [emergencyOnly, setEmergencyOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<CompletedJourney | null>(null);

  const emergencyJourneys = React.useMemo(() => selectEmergencyJourneys(history), [history]);
  const visible = (emergencyOnly ? emergencyJourneys : history).slice(0, DASHBOARD_ROW_LIMIT);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{t("dashboard.recentJourneys")}</CardTitle>
        <div className="flex items-center gap-2">
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
          {history.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
              <Link href="/journeys">View all</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={visible.length > 0 ? "p-0" : undefined}>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Destination</th>
                  <th className="px-4 py-2.5 font-medium">Mode</th>
                  <th className="px-4 py-2.5 font-medium">Completed</th>
                  <th className="px-4 py-2.5 font-medium">Events</th>
                  <th className="px-4 py-2.5 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => setSelected(j)}
                    className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-foreground/[0.04]"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-1.5">
                        {j.destination}
                        {j.wasEscalated && <AlertOctagon className="size-3.5 text-destructive" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {MODE_LABEL_KEY[j.mode] ? t(MODE_LABEL_KEY[j.mode]) : j.mode}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatJourneyWhen(j.completedAt, locale)}</td>
                    <td className="px-4 py-3">
                      {j.emergencyEvents.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          {j.emergencyEvents.length} event{j.emergencyEvents.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
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

      <JourneyDetailDialog journey={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </Card>
  );
}
