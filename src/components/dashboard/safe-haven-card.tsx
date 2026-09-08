"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { LifeBuoy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistance } from "@/lib/geo";
import type { SafeZone, SafeZoneCategory } from "@/lib/geo";
import { requestAI } from "@/lib/ai/client";
import { useT } from "@/lib/i18n/use-t";

const CATEGORY_BASE_RATING: Record<SafeZoneCategory, number> = {
  police: 96,
  hospital: 94,
  metro: 88,
  college: 85,
  hotel: 84,
  fuel: 80,
  store: 78,
  temple: 82,
};

function ratingFor(zone: SafeZone) {
  const base = CATEGORY_BASE_RATING[zone.category];
  const distancePenalty = Math.min(8, Math.round(zone.distanceMeters / 300));
  return Math.max(60, base - distancePenalty);
}

function etaMinutes(distanceMeters: number) {
  return Math.max(1, Math.round(distanceMeters / (1.3 * 60)));
}

function ReasonLine({ zone }: { zone: SafeZone }) {
  const [reason, setReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    requestAI("safe-haven", { label: zone.label, category: zone.category, distanceMeters: zone.distanceMeters }).then(
      (res) => {
        if (!cancelled) setReason(res.text);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.label]);

  const { t } = useT();
  if (!reason) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> {t("dashboard.reasoning")}
      </span>
    );
  }
  return <p className="text-xs text-muted-foreground">{reason}</p>;
}

export function SafeHavenCard({ zones }: { zones: SafeZone[] }) {
  const { t } = useT();
  const top = React.useMemo(
    () =>
      [...zones]
        .sort((a, b) => ratingFor(b) - ratingFor(a) || a.distanceMeters - b.distanceMeters)
        .slice(0, 3),
    [zones]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LifeBuoy className="size-4.5 text-brand-emerald" />
          {t("dashboard.aiSafeHaven")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.noSafeZones")}</p>
        ) : (
          top.map((zone, idx) => {
            const rating = ratingFor(zone);
            return (
              <motion.div
                key={`${zone.lat}-${zone.lng}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex flex-col gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{zone.label}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">{zone.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-emerald/15 px-2 py-0.5 text-xs font-semibold text-brand-emerald">
                    {rating}% {t("dashboard.safePercent")}
                  </span>
                </div>
                <ReasonLine zone={zone} />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {t("dashboard.distance")} <span className="font-medium text-foreground">{formatDistance(zone.distanceMeters)}</span>
                  </span>
                  <span>
                    ETA <span className="font-medium text-foreground">{etaMinutes(zone.distanceMeters)} min</span>
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
