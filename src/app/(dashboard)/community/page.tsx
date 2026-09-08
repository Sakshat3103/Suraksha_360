"use client";

import * as React from "react";
import { ReportDialog } from "@/components/dashboard/report-dialog";
import { ReportList } from "@/components/dashboard/report-list";
import { CommunitySummaryCard } from "@/components/dashboard/community-summary-card";
import { CommunityMapClient } from "@/components/dashboard/community-map-client";
import { useCommunityStore } from "@/store/use-community-store";

const MUJ_CENTER = { lat: 26.8434, lng: 75.5626 };

export default function CommunityPage() {
  const reports = useCommunityStore((s) => s.reports);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Community Safety Network</h2>
          <p className="text-sm text-muted-foreground">
            Anonymous, crowdsourced safety reports — summarized by AI to warn others nearby.
          </p>
        </div>
        <ReportDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <CommunityMapClient reports={reports} center={MUJ_CENTER} />
        <CommunitySummaryCard reports={reports} center={MUJ_CENTER} />
      </div>

      <ReportList reports={[...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())} />
    </div>
  );
}
