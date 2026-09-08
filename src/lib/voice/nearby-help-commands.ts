// Fast, local (no AI round-trip) matcher for "take me to the nearest
// police station / hospital" style voice commands. Kept separate from the
// Gemini emergency classifier so a simple navigation request never waits
// on a network call and never gets miscategorized as a danger signal.
export type HelpCategory = "police" | "hospital";

const POLICE_PATTERN = /\b(police( station)?|cop shop|thana)\b/i;
const HOSPITAL_PATTERN = /\b(hospital|clinic|medical (help|center|centre)|emergency room|er\b)\b/i;
const NAV_INTENT_PATTERN = /\b(nearest|nearby|closest|find|take me to|navigate to|directions? to|show me|where is)\b/i;

/**
 * Returns the requested help category only when the sentence both mentions
 * police/hospital AND carries a navigation-style intent word — this keeps
 * ordinary mentions ("I saw a police car") from triggering navigation.
 */
export function matchNearbyHelpCommand(transcript: string): HelpCategory | null {
  if (!NAV_INTENT_PATTERN.test(transcript)) return null;
  if (POLICE_PATTERN.test(transcript)) return "police";
  if (HOSPITAL_PATTERN.test(transcript)) return "hospital";
  return null;
}
