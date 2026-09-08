import type { Metadata } from "next";
import { ShieldAlert, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Alerts — Suraksha360" };

export default function AlertsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Alerts</h2>
        <p className="text-sm text-muted-foreground">
          SOS triggers, route deviations, and safety check-in misses show up here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4.5 text-brand-blue" />
            Alert history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground">
              <BellOff className="size-5" />
            </span>
            <p className="text-sm font-medium">No alerts yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              You&apos;ll see a record here the moment an SOS is triggered, a journey deviates from
              its planned route, or a safety check-in is missed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
