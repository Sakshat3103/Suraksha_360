"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Flag, History, LifeBuoy, MapPin, ShieldAlert, Siren, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimelineStore, type TimelineEvent } from "@/store/use-timeline-store";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<TimelineEvent["kind"], typeof Flag> = {
  start: Flag,
  risk: TrendingUp,
  stop: AlertTriangle,
  deviation: MapPin,
  report: ShieldAlert,
  recommendation: LifeBuoy,
  guardian: Siren,
  end: Flag,
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function JourneyTimeline() {
  const events = useTimelineStore((s) => s.events);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4.5 text-brand-blue" />
          AI Journey Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Start a journey to see a live, explainable timeline here.</p>
        ) : (
          <div className="relative flex flex-col gap-0">
            {events.map((e, idx) => {
              const Icon = KIND_ICON[e.kind];
              const prevRisk = idx > 0 ? events.slice(0, idx).reverse().find((ev) => ev.risk !== undefined)?.risk : undefined;
              const rising = e.risk !== undefined && prevRisk !== undefined && e.risk > prevRisk;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  {idx < events.length - 1 && (
                    <span className="absolute top-7 left-3.5 h-full w-px bg-white/10" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border",
                      e.kind === "stop" || e.kind === "deviation" || e.kind === "report"
                        ? "border-amber-400/30 bg-amber-400/15 text-amber-300"
                        : e.kind === "guardian"
                          ? "border-destructive/30 bg-destructive/15 text-destructive"
                          : "border-brand-blue/30 bg-brand-blue/15 text-brand-blue"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pt-0.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.label}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(e.time)}</p>
                    </div>
                    {e.risk !== undefined && (
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums",
                          rising ? "text-brand-emerald" : "text-amber-300"
                        )}
                      >
                        {rising ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {e.risk}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
