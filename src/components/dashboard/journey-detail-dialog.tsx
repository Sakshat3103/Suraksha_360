"use client";

import { AlertOctagon, MapPinned, TimerReset } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CompletedJourney } from "@/store/use-journey-store";
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

export function formatJourneyWhen(iso: string, locale: LocaleCode) {
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

// Shared detail dialog for a single completed journey — used by both the
// dashboard's compact summary table and the full /journeys page, so a
// click-through from either place shows the exact same full record:
// every emergency event and the precise timestamp it fired.
export function JourneyDetailDialog({
  journey,
  onOpenChange,
}: {
  journey: CompletedJourney | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useT();

  return (
    <Dialog open={journey !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {journey && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                {journey.destination}
                {journey.wasEscalated && <AlertOctagon className="size-4 text-destructive" />}
              </DialogTitle>
              <DialogDescription>
                {MODE_LABEL_KEY[journey.mode] ? t(MODE_LABEL_KEY[journey.mode]) : journey.mode} ·{" "}
                {journey.distanceText} · Completed {formatJourneyWhen(journey.completedAt, locale)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] px-4 py-3">
              <span className="text-sm text-muted-foreground">Safety score</span>
              <span
                className={cn(
                  "text-lg font-semibold",
                  journey.safetyScore >= 75 ? "text-brand-emerald" : "text-amber-300"
                )}
              >
                {journey.safetyScore}/100
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Emergency events
              </p>
              {journey.emergencyEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emergency events on this journey.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {journey.emergencyEvents.map((e, i) => (
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
  );
}
