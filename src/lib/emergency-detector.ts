import type { RiskFactors } from "@/lib/risk-engine";

export type EmergencyLevel = "low" | "medium" | "high" | "critical";

export interface EmergencyResult {
  level: EmergencyLevel;
  reasons: string[];
  autoNotifyGuardian: boolean;
}

// Smart Emergency Detection — a second, purpose-built pass over the same
// journey signals the risk engine uses, tuned specifically to catch the
// anomaly patterns that matter for an emergency call (not general safety
// scoring): a stop that's gone on far too long, a sharp deviation, an SOS
// already in flight. Deterministic, same as the risk engine.
export function computeEmergencyLevel(
  f: Pick<RiskFactors, "unexpectedStopSeconds" | "routeDeviationMeters" | "communityReportsNearby" | "isEscalated"> & {
    manualSosActive: boolean;
    safetyScore: number;
  }
): EmergencyResult {
  const reasons: string[] = [];
  let points = 0;

  if (f.manualSosActive || f.isEscalated) {
    points += 60;
    reasons.push("Manual SOS or escalation already active");
  }
  if (f.unexpectedStopSeconds > 540) {
    points += 40;
    reasons.push(`Unexpected stop for ${Math.round(f.unexpectedStopSeconds / 60)} minutes`);
  } else if (f.unexpectedStopSeconds > 240) {
    points += 20;
    reasons.push(`Stationary for ${Math.round(f.unexpectedStopSeconds / 60)} minutes`);
  }
  if (f.routeDeviationMeters > 400) {
    points += 30;
    reasons.push("Rapid route deviation detected");
  } else if (f.routeDeviationMeters > 150) {
    points += 12;
    reasons.push("Route deviation detected");
  }
  if (f.communityReportsNearby >= 2) {
    points += 15;
    reasons.push(`${f.communityReportsNearby} community reports nearby`);
  }
  if (f.safetyScore < 40) {
    points += 20;
    reasons.push(`Safety score dropped to ${f.safetyScore}`);
  }

  let level: EmergencyLevel = "low";
  if (points >= 80) level = "critical";
  else if (points >= 50) level = "high";
  else if (points >= 25) level = "medium";

  if (reasons.length === 0) reasons.push("No anomalies detected");

  return {
    level,
    reasons,
    autoNotifyGuardian: level === "high" || level === "critical",
  };
}
