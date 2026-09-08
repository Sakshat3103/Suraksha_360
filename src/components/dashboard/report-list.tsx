"use client";

import { AlertTriangle, Lightbulb, Ambulance, ShieldCheck, CircleAlert, Car, ShieldHalf, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CommunityReport, ReportCategory } from "@/store/use-community-store";
import { useT } from "@/lib/i18n/use-t";
import { translate } from "@/lib/i18n/dictionary";
import type { LocaleCode } from "@/store/use-locale-store";

const CATEGORY_ICON: Record<ReportCategory, typeof AlertTriangle> = {
  Harassment: AlertTriangle,
  "Broken Streetlights": Lightbulb,
  "Road Hazard": Construction,
  "Unsafe Area": CircleAlert,
  Accident: Car,
  "Suspicious Activity": ShieldHalf,
  "Police Patrol": ShieldCheck,
  "Medical Emergency": Ambulance,
};

const TRUST_LABEL_KEY = {
  verified: "community.trustVerified",
  unverified: "community.trustUnverified",
  flagged: "community.trustFlagged",
} as const;

const TRUST_CLASS = {
  verified: "bg-brand-emerald/15 text-brand-emerald",
  unverified: "bg-amber-500/15 text-amber-500",
  flagged: "bg-destructive/15 text-destructive",
} as const;

const CATEGORY_LABEL_KEY: Record<ReportCategory, string> = {
  "Harassment": "community.catHarassment",
  "Broken Streetlights": "community.catStreetlights",
  "Road Hazard": "community.catRoadHazard",
  "Unsafe Area": "community.catUnsafeArea",
  "Accident": "community.catAccident",
  "Suspicious Activity": "community.catSuspicious",
  "Police Patrol": "community.catPolicePatrol",
  "Medical Emergency": "community.catMedical",
};

function timeAgo(iso: string, locale: LocaleCode) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return translate("community.justNow", locale);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ReportList({ reports }: { reports: CommunityReport[] }) {
  const { t, locale } = useT();
  if (reports.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-2xl p-10 text-center">
        <p className="text-sm font-medium">{t("community.noReportsYet")}</p>
        <p className="text-xs text-muted-foreground">{t("community.beFirstToReport")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reports.map((r) => {
        const Icon = CATEGORY_ICON[r.category];
        return (
          <Card key={r.id}>
            <CardContent className="flex gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-amber-300">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt, locale)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{t(CATEGORY_LABEL_KEY[r.category])}</p>
                  <Badge className={cn("h-4.5 px-1.5 text-[10px]", TRUST_CLASS[r.trust])}>{t(TRUST_LABEL_KEY[r.trust])}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                {r.imageDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- user-submitted data URL, not an optimizable static asset
                  <img src={r.imageDataUrl} alt="Report attachment" className="mt-2 max-h-32 rounded-lg object-cover" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
