"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const CommunityMapClient = dynamic(
  () => import("./community-map").then((m) => m.CommunityMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading map…
      </div>
    ),
  }
);
