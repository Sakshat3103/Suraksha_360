"use client";

import { AlertTriangle, Lightbulb, Ambulance, ShieldCheck, CircleAlert, Car, ShieldHalf, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CommunityReport, ReportCategory } from "@/store/use-community-store";

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

const TRUST_META = {
  verified: { label: "Corroborated", className: "bg-brand-emerald/15 text-brand-emerald" },
  unverified: { label: "Unverified", className: "bg-amber-500/15 text-amber-500" },
  flagged: { label: "Low detail — possibly fake", className: "bg-destructive/15 text-destructive" },
} as const;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ReportList({ reports }: { reports: CommunityReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-2xl p-10 text-center">
        <p className="text-sm font-medium">No reports yet</p>
        <p className="text-xs text-muted-foreground">Be the first to report a safety concern nearby.</p>
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
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{r.category}</p>
                  <Badge className={cn("h-4.5 px-1.5 text-[10px]", TRUST_META[r.trust].className)}>{TRUST_META[r.trust].label}</Badge>
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
