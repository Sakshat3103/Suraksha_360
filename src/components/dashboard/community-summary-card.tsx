"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestAI } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import type { CommunityReport } from "@/store/use-community-store";
import { haversineMeters } from "@/lib/geo";
import { useT } from "@/lib/i18n/use-t";
import { translate } from "@/lib/i18n/dictionary";
import { useLocaleStore } from "@/store/use-locale-store";

const WINDOW_DAYS = 7;
const RADIUS_METERS = 1000;

export function CommunitySummaryCard({
  reports,
  center,
}: {
  reports: CommunityReport[];
  center: { lat: number; lng: number };
}) {
  const { t } = useT();
  const relevant = React.useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional: this recomputes the 7-day window each time reports/center change
    const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return reports.filter(
      (r) => new Date(r.createdAt).getTime() >= cutoff && haversineMeters(center, r) <= RADIUS_METERS
    );
  }, [reports, center]);

  const topCategory = React.useMemo(() => {
    const counts = new Map<string, number>();
    relevant.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    let best: [string, number] | null = null;
    counts.forEach((count, category) => {
      if (!best || count > best[1]) best = [category, count];
    });
    return best;
  }, [relevant]);

  const [summary, setSummary] = React.useState<{ text: string; riskLevel: "Low" | "Medium" | "High" } | null>(null);

  const locale = useLocaleStore((s) => s.locale);

  React.useEffect(() => {
    let cancelled = false;
    if (!topCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing the summary with the async AI call below (no-report short-circuit)
      setSummary({ text: translate("community.noReportsNearby7d", locale), riskLevel: "Low" });
      return;
    }
    requestAI("community-summary", {
      category: topCategory[0],
      count: topCategory[1],
      windowDays: WINDOW_DAYS,
      radiusMeters: RADIUS_METERS,
    }).then((res) => {
      if (!cancelled) setSummary({ text: res.text, riskLevel: (res.riskLevel as "Low" | "Medium" | "High") ?? "Low" });
    });
    return () => {
      cancelled = true;
    };
  }, [topCategory, locale]);

  const toneClass =
    summary?.riskLevel === "High"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : summary?.riskLevel === "Medium"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : "border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4.5 text-brand-violet" />
          {t("community.aiSummaryTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!summary ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> {t("community.analyzingReports")}
          </span>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{summary.text}</p>
            <div className={cn("flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", toneClass)}>
              <AlertTriangle className="size-3.5" /> {t("community.riskLevel")}: {summary.riskLevel}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
