// Reads/writes completed-journey history to Supabase so it survives logout
// and syncs across devices, instead of living only in the client-side
// useJourneyStore (which is reset to empty on every fresh session).

import { createClient } from "@/lib/supabase/client";
import type { CompletedJourney, EmergencyEvent, TravelMode } from "@/store/use-journey-store";

export async function saveCompletedJourney(journey: CompletedJourney): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // not signed in: nothing to persist to

  const { data: inserted, error: journeyError } = await supabase
    .from("journeys")
    .insert({
      user_id: user.id,
      destination: journey.destination,
      mode: journey.mode,
      distance_text: journey.distanceText,
      safety_score: journey.safetyScore,
      was_escalated: journey.wasEscalated,
      completed_at: journey.completedAt,
    })
    .select("id")
    .single();

  if (journeyError || !inserted) {
    console.error("Failed to save journey history", journeyError);
    return;
  }

  if (journey.emergencyEvents.length > 0) {
    const rows = journey.emergencyEvents.map((e: EmergencyEvent) => ({
      journey_id: inserted.id as string,
      type: e.type,
      occurred_at: e.at,
      detail: e.detail ?? null,
    }));
    const { error: eventsError } = await supabase.from("journey_emergency_events").insert(rows);
    if (eventsError) console.error("Failed to save emergency events", eventsError);
  }
}

export async function fetchJourneyHistory(limit = 20): Promise<CompletedJourney[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("id, destination, mode, distance_text, safety_score, was_escalated, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !journeys) {
    console.error("Failed to fetch journey history", error);
    return [];
  }

  const ids = journeys.map((j) => j.id as string);
  const { data: events } = ids.length
    ? await supabase
        .from("journey_emergency_events")
        .select("journey_id, type, occurred_at, detail")
        .in("journey_id", ids)
    : { data: [] as { journey_id: string; type: string; occurred_at: string; detail: string | null }[] };

  return journeys.map((j) => {
    const journeyEvents: EmergencyEvent[] = (events ?? [])
      .filter((e) => e.journey_id === j.id)
      .map((e) => ({
        type: e.type as EmergencyEvent["type"],
        at: e.occurred_at,
        detail: e.detail ?? undefined,
      }));
    return {
      id: j.id as string,
      destination: j.destination as string,
      mode: j.mode as TravelMode,
      distanceText: (j.distance_text as string) ?? "",
      safetyScore: (j.safety_score as number) ?? 0,
      completedAt: j.completed_at as string,
      wasEscalated: j.was_escalated as boolean,
      emergencyFlags: Array.from(new Set(journeyEvents.map((e) => e.type))),
      emergencyEvents: journeyEvents,
    } satisfies CompletedJourney;
  });
}
