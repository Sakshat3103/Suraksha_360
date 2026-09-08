"use client";

import { AlertOctagon, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJourneyStore } from "@/store/use-journey-store";

const MODE_LABEL: Record<string, string> = {
  walking: "Walking",
  bus: "Bus",
  metro: "Metro",
  cab: "Cab",
  scooty: "Scooty",
  school_bus: "School bus",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

// Real completed journeys only — populated the moment a journey ends (see
// endJourney in use-journey-store), never seeded with placeholder data.
export function RecentJourneysCard() {
  const history = useJourneyStore((s) => s.history);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent journeys</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
              <History className="size-4.5" />
            </span>
            <p className="text-sm font-medium">No journeys yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Journeys you complete with Suraksha360 will show up here.
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
                    {MODE_LABEL[j.mode] ?? j.mode} · {j.distanceText} · {formatWhen(j.completedAt)}
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
