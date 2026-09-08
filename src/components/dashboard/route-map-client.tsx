"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const RouteMapClient = dynamic(
  () => import("./route-map").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading map…
      </div>
    ),
  }
);
