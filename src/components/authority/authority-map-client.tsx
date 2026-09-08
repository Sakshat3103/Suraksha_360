"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const AuthorityMapClient = dynamic(
  () => import("./authority-map").then((m) => m.AuthorityMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center gap-2 rounded-xl border border-border bg-card/40 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading map…
      </div>
    ),
  }
);
