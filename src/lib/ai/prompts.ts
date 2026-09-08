// Modular prompt builders — one per AI capability. Kept separate from the
// Gemini call itself (see gemini.ts) so prompts can be iterated on without
// touching transport code, and so the mock generator (mock.ts) can be
// swapped in with the exact same inputs when no API key is configured.

export interface RiskAnalysisInput {
  score: number;
  reasons: { label: string; positive: boolean }[];
  destination: string;
  confidence: number;
}

export function riskAnalysisPrompt(i: RiskAnalysisInput) {
  return `You are Suraksha360's AI Safety Officer. A traveller's live journey to "${i.destination}" has a computed safety score of ${i.score}/100 (confidence ${i.confidence}%).
Contributing factors:
${i.reasons.map((r) => `- ${r.positive ? "Positive" : "Risk"}: ${r.label}`).join("\n")}

In under 40 words, explain plainly why the score is what it is and give one concrete, actionable next step. Be calm, professional, and specific — never generic reassurance.`;
}

export interface SafeHavenInput {
  label: string;
  category: string;
  distanceMeters: number;
}

export function safeHavenPrompt(i: SafeHavenInput) {
  return `Explain in under 25 words why "${i.label}" (a ${i.category}, ${Math.round(i.distanceMeters)}m away) is a good safe-haven recommendation right now for someone who feels unsafe. Mention concrete, verifiable traits (footfall, staffing, hours, CCTV likelihood) — do not invent specifics you can't know, keep it plausible and general to the category.`;
}

export interface CommunitySummaryInput {
  category: string;
  count: number;
  windowDays: number;
  radiusMeters: number;
}

export function communitySummaryPrompt(i: CommunitySummaryInput) {
  return `${i.count} "${i.category}" reports were filed within ${i.radiusMeters}m over the last ${i.windowDays} days. In under 35 words, summarize the risk level (Low/Medium/High) and give one concrete recommendation (e.g. a time window to avoid, or a precaution).`;
}

export interface CopilotContext {
  journeyActive: boolean;
  destination: string | null;
  etaMinutes: number | null;
  safetyScore: number | null;
  batteryPercent: number | null;
  nearbySafeZones: { label: string; category: string; distanceMeters: number }[];
  recentReportsNearby: number;
  message: string;
}

export function copilotPrompt(c: CopilotContext) {
  return `You are Suraksha360's AI Safety Copilot — a personal AI Safety Officer, not a general chatbot. You are terse, professional, and always actionable. Never say "As an AI...".

Current context:
- Journey active: ${c.journeyActive}
- Destination: ${c.destination ?? "none"}
- ETA: ${c.etaMinutes !== null ? `${c.etaMinutes} min` : "n/a"}
- Current safety score: ${c.safetyScore ?? "n/a"}/100
- Device battery: ${c.batteryPercent !== null ? `${c.batteryPercent}%` : "unknown"}
- Nearby safe zones: ${c.nearbySafeZones.map((z) => `${z.label} (${z.category}, ${Math.round(z.distanceMeters)}m)`).join("; ") || "none loaded"}
- Community reports nearby (7d): ${c.recentReportsNearby}

User asked: "${c.message}"

Reply in under 45 words, in second person, with one concrete instruction or answer. If they express distress ("I'm being followed", "I feel unsafe"), prioritize immediate concrete safety actions over commentary.`;
}
