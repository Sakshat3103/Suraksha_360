"use client";

import { CheckCircle2, MapPinned, ShieldAlert, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useJourneyStore } from "@/store/use-journey-store";
import { useT } from "@/lib/i18n/use-t";

// Every number here is derived from real session state — completed
// journeys and SOS triggers — instead of hardcoded demo figures. Numbers
// naturally start at zero for a fresh account and grow as you use the app.
export function DashboardStats() {
  const history = useJourneyStore((s) => s.history);
  const { t } = useT();

  const now = new Date();
  const thisMonth = history.filter((j) => {
    const d = new Date(j.completedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const safeArrivals = history.filter((j) => !j.wasEscalated).length;
  const sosCount = history.filter((j) => j.wasEscalated).length;
  const avgScore = history.length
    ? Math.round(history.reduce((sum, j) => sum + j.safetyScore, 0) / history.length)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile icon={MapPinned} label={t("dashboard.journeysThisMonth")} value={String(thisMonth.length)} />
      <StatTile icon={CheckCircle2} label={t("dashboard.safeArrivals")} value={String(safeArrivals)} tone="success" />
      <StatTile
        icon={ShieldAlert}
        label={t("dashboard.sosTriggered")}
        value={String(sosCount)}
        tone={sosCount > 0 ? "warning" : "default"}
      />
      <StatTile
        icon={TrendingUp}
        label={t("dashboard.avgSafetyScore")}
        value={avgScore !== null ? `${avgScore}/100` : "—"}
      />
    </div>
  );
}
