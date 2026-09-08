// Deterministic, rule-based stand-ins for each AI capability. Used whenever
// GEMINI_API_KEY isn't configured (e.g. local demo, offline judging) so the
// app is fully functional without any key — per the brief: "whenever APIs
// are unavailable, generate realistic mock AI responses". These read the
// same structured inputs a real Gemini call would, so swapping in the real
// model later changes zero call sites — only src/lib/ai/gemini.ts.
import type { CopilotContext, RiskAnalysisInput, SafeHavenInput, CommunitySummaryInput } from "./prompts";

export function mockRiskAnalysis(i: RiskAnalysisInput): string {
  const negatives = i.reasons.filter((r) => !r.positive).map((r) => r.label);
  const positives = i.reasons.filter((r) => r.positive).map((r) => r.label);
  if (i.score >= 75) {
    return `Score is high mainly because of ${positives[0]?.toLowerCase() ?? "favourable conditions"}${
      positives[1] ? ` and ${positives[1].toLowerCase()}` : ""
    }. Continue toward ${i.destination} as planned — no action needed right now.`;
  }
  if (i.score >= 50) {
    return `Score dipped due to ${negatives[0]?.toLowerCase() ?? "changing conditions"}. Stay on the planned route to ${i.destination} and keep your live location shared with your circle.`;
  }
  return `Score is low: ${negatives.slice(0, 2).join(" and ").toLowerCase() || "multiple risk factors"} detected. Consider heading to the nearest recommended safe zone instead of continuing to ${i.destination}.`;
}

export function mockSafeHavenReason(i: SafeHavenInput): string {
  const byCategory: Record<string, string> = {
    hospital: "Open 24x7 with staff always present and high footfall — a reliable place to wait safely.",
    police: "Staffed around the clock; the fastest place to get direct help nearby.",
    temple: "Typically busy with visitors and on-site staff, offering safety in numbers.",
    college: "High daytime footfall with security desks at most campus gates.",
    hotel: "Staffed reception and CCTV coverage are standard, with people around at most hours.",
    metro: "High footfall and station staff, with CCTV coverage typical of transit hubs.",
    fuel: "Attendants on-site and usually well-lit even late at night.",
    store: "Staffed during business hours with steady footfall and likely CCTV coverage.",
  };
  return byCategory[i.category] ?? `A short ${Math.round(i.distanceMeters)}m detour to a populated, verifiable location.`;
}

export function mockCommunitySummary(i: CommunitySummaryInput): { text: string; riskLevel: "Low" | "Medium" | "High" } {
  const riskLevel = i.count >= 4 ? "High" : i.count >= 2 ? "Medium" : "Low";
  const text =
    i.count === 0
      ? `No ${i.category.toLowerCase()} reports filed within ${i.radiusMeters}m in the last ${i.windowDays} days. Conditions look normal for this category.`
      : `${i.count} ${i.category.toLowerCase()} report${i.count > 1 ? "s" : ""} filed within ${i.radiusMeters}m over the last ${i.windowDays} days. Risk level: ${riskLevel}. ${
          riskLevel === "High"
            ? "Recommended to avoid this area after 8 PM until reports subside."
            : riskLevel === "Medium"
              ? "Stay alert and prefer well-lit, populated routes through this area."
              : "No special precaution needed beyond normal awareness."
        }`;
  return { text, riskLevel };
}

export function mockCopilotReply(c: CopilotContext): string {
  const msg = c.message.toLowerCase();

  if (msg.includes("followed") || msg.includes("uncomfortable") || msg.includes("unsafe") || msg.includes("scared")) {
    const haven = c.nearbySafeZones[0];
    return haven
      ? `Head to ${haven.label} now — it's ${Math.round(haven.distanceMeters)}m away and populated. I'm sharing your live location with your guardians and starting an escalation timer.`
      : `Move toward the nearest populated, well-lit area immediately and stay on a main road. I'm sharing your live location with your guardians now.`;
  }
  if (msg.includes("am i safe") || msg.includes("safe?")) {
    return c.safetyScore !== null
      ? `Your current safety score is ${c.safetyScore}/100${c.safetyScore >= 75 ? " — conditions look good, continue as planned." : c.safetyScore >= 50 ? " — moderate risk, stay alert and stick to the main route." : " — risk is elevated, consider rerouting to a safe zone."}`
      : `Start a Safe Journey and I'll track your safety score in real time.`;
  }
  if (msg.includes("why") && (msg.includes("decrease") || msg.includes("drop") || msg.includes("lower"))) {
    return `Your score dropped based on real-time factors — time of day, route deviation, or nearby community reports. Check the Safety Score card for the exact breakdown.`;
  }
  if (msg.includes("safer route") || msg.includes("reroute")) {
    return `I recommend routing through well-lit main roads and avoiding shortcuts through isolated stretches. Tap "I'm being followed" on your journey card for an instant reroute to a verified safe zone.`;
  }
  if (msg.includes("police")) {
    const p = c.nearbySafeZones.find((z) => z.category === "police");
    return p ? `Nearest police station: ${p.label}, ${Math.round(p.distanceMeters)}m away.` : `No police station found in your immediate radius — I'd recommend calling 112 directly if this is urgent.`;
  }
  if (msg.includes("hospital")) {
    const h = c.nearbySafeZones.find((z) => z.category === "hospital");
    return h ? `Nearest hospital: ${h.label}, ${Math.round(h.distanceMeters)}m away.` : `No hospital found nearby — call 112 for urgent medical help.`;
  }
  if (msg.includes("what should i do") || msg.includes("help")) {
    return `Stay calm, stay visible, and head to the nearest safe zone I've surfaced on your map. Your guardians already have your live location if a journey is active.`;
  }
  if (msg.includes("battery")) {
    return c.batteryPercent !== null
      ? `Your device is at ${c.batteryPercent}%. ${c.batteryPercent < 20 ? "That's low — consider notifying a guardian in case location sharing drops." : "That's enough for continuous tracking through your journey."}`
      : `I can't read your device battery level in this browser context.`;
  }
  return `I'm tracking your journey${c.journeyActive ? ` to ${c.destination}` : ""}${
    c.safetyScore !== null ? ` — current safety score ${c.safetyScore}/100` : ""
  }. Ask me things like "Am I safe?", "Find the nearest police station", or "I'm being followed".`;
}
