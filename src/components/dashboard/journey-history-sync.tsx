"use client";

import * as React from "react";
import { useJourneyStore } from "@/store/use-journey-store";
import { fetchJourneyHistory } from "@/lib/journey-history-service";

// Seeds the in-memory journey history from Supabase once on mount, so a
// user who just signed back in (or opened the app on a new device) sees
// their past journeys and emergency-event timestamps again, instead of an
// empty list. Local state stays the fast path for the current session —
// this only runs once to backfill it.
export function JourneyHistorySync() {
  React.useEffect(() => {
    fetchJourneyHistory().then((remote) => {
      if (remote.length > 0) {
        useJourneyStore.setState((s) => ({
          // Merge rather than overwrite, in case a journey ended locally
          // in the same tick before this fetch resolved.
          history: [
            ...s.history,
            ...remote.filter((r) => !s.history.some((h) => h.id === r.id)),
          ]
            .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
            .slice(0, 20),
        }));
      }
    });
  }, []);

  return null;
}
