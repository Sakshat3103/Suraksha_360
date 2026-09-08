import type { Metadata } from "next";
import { JourneyCard } from "@/components/dashboard/journey-card";
import { TrustedCircleCard } from "@/components/dashboard/trusted-circle-card";
import { RecentJourneysCard } from "@/components/dashboard/recent-journeys-card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export const metadata: Metadata = { title: "Dashboard — Suraksha360" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <JourneyCard />
        <TrustedCircleCard />
      </div>

      <RecentJourneysCard />

      {/* Overview stats moved below the main journey/contacts area — they're
          a summary, not the primary thing to look at when opening the app. */}
      <DashboardStats />
    </div>
  );
}
