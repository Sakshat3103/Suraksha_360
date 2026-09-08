"use client";

import { AlertOctagon, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJourneyStore } from "@/store/use-journey-store";
import { translate } from "@/lib/i18n/dictionary";
import type { LocaleCode } from "@/store/use-locale-store";
import { useT } from "@/lib/i18n/use-t";

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

// Real completed journeys only — populated the moment a journey ends (see
// endJourney in use-journey-store), never seeded with placeholder data.
export function RecentJourneysCard() {
  const history = useJourneyStore((s) => s.history);
  const { t, locale } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.recentJourneys")}</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-muted-foreground">
              <History className="size-4.5" />
            </span>
            <p className="text-sm font-medium">{t("dashboard.noJourneysYet")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {t("dashboard.noJourneysDesc")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/10">
            {history.map((j) => (
              <div key={j.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {j.destination}
                    {j.wasEscalated && <AlertOctagon className="size-3.5 text-destructive" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {MODE_LABEL_KEY[j.mode] ? t(MODE_LABEL_KEY[j.mode]) : j.mode} · {j.distanceText} · {formatWhen(j.completedAt, locale)}
                  </p>
                </div>
                <span
                  className={
                    "text-sm font-semibold " +
                    (j.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300")
                  }
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
