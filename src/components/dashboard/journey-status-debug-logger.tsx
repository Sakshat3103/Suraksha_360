"use client";

import * as React from "react";
import { useJourneyStore } from "@/store/use-journey-store";

// TEMPORARY DEBUG — remove once the "journey deactivates when navigating
// to another page" issue is found. Logs every change to the journey
// status, with the before/after value and a stack trace, directly to the
// browser console (open DevTools > Console before reproducing). This is
// the only way to catch *where* status flips to "idle" unexpectedly,
// since reading the code top-down hasn't found an obvious cause.
export function JourneyStatusDebugLogger() {
  React.useEffect(() => {
    let prevStatus = useJourneyStore.getState().status;
    const unsubscribe = useJourneyStore.subscribe((state) => {
      if (state.status !== prevStatus) {
        console.warn(
          `[DEBUG journey status] ${prevStatus} -> ${state.status} (route: ${state.route ? "present" : "null"})`
        );
        console.trace("[DEBUG journey status] change triggered from:");
        prevStatus = state.status;
      }
    });
    return unsubscribe;
  }, []);

  return null;
}
