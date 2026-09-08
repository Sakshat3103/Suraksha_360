// Deterministic AI Risk Engine — every input maps to the same score, every
// time, and every point swing is backed by a named factor. Nothing here is
// Math.random(): the "AI" in AI Risk Engine is the weighted, explainable
// reasoning below, which is exactly what an LLM prompt (see src/lib/ai/)
// narrates in natural language on top of.

export interface RiskFactors {
  hour: number; // 0-23, local time
  distanceRemainingMeters: number;
  totalDistanceMeters: number;
  elapsedSeconds: number;
  expectedDurationSeconds: number;
  routeDeviationMeters: number; // how far off the planned path, 0 = on track
  unexpectedStopSeconds: number; // 0 = moving normally
  nearbySafeZoneCount: number; // hospitals/police/etc within safe radius
  nearbyPoliceOrHospital: boolean;
  communityReportsNearby: number; // harassment/unsafe reports within 1km, last 7d
  isEscalated: boolean;
}

export interface RiskReason {
  label: string;
  positive: boolean;
}

export interface RiskResult {
  score: number; // 0-100, higher = safer
  reasons: RiskReason[];
  confidence: number; // 0-100
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeSafetyScore(f: RiskFactors): RiskResult {
  let score = 82; // baseline for an in-progress, on-track journey
  const reasons: RiskReason[] = [];

  if (f.hour >= 22 || f.hour < 5) {
    score -= 20;
    reasons.push({ label: "Late-night travel window", positive: false });
  } else if (f.hour >= 19) {
    score -= 8;
    reasons.push({ label: "Evening travel — reduced visibility", positive: false });
  } else {
    reasons.push({ label: "Daylight hours — good visibility", positive: true });
  }

  if (f.nearbyPoliceOrHospital) {
    score += 10;
    reasons.push({ label: "Police station or hospital nearby", positive: true });
  }
  if (f.nearbySafeZoneCount >= 3) {
    score += 6;
    reasons.push({ label: "Multiple verified safe zones nearby", positive: true });
  } else if (f.nearbySafeZoneCount === 0) {
    score -= 8;
    reasons.push({ label: "No verified safe zones nearby", positive: false });
  }

  if (f.routeDeviationMeters > 400) {
    score -= 22;
    reasons.push({ label: "Significant route deviation detected", positive: false });
  } else if (f.routeDeviationMeters > 150) {
    score -= 10;
    reasons.push({ label: "Minor route deviation detected", positive: false });
  }

  if (f.unexpectedStopSeconds > 480) {
    score -= 28;
    reasons.push({ label: `Unexpected stop for ${Math.round(f.unexpectedStopSeconds / 60)} min`, positive: false });
  } else if (f.unexpectedStopSeconds > 180) {
    score -= 14;
    reasons.push({ label: `Stationary for ${Math.round(f.unexpectedStopSeconds / 60)} min`, positive: false });
  }

  if (f.communityReportsNearby >= 3) {
    score -= 18;
    reasons.push({ label: `${f.communityReportsNearby} community reports nearby`, positive: false });
  } else if (f.communityReportsNearby > 0) {
    score -= 8;
    reasons.push({ label: `${f.communityReportsNearby} community report nearby`, positive: false });
  } else {
    reasons.push({ label: "No recent community reports nearby", positive: true });
  }

  const progress = 1 - f.distanceRemainingMeters / Math.max(f.totalDistanceMeters, 1);
  if (progress > 0.85) {
    score += 6;
    reasons.push({ label: "Nearly at destination", positive: true });
  }

  if (f.expectedDurationSeconds > 0 && f.elapsedSeconds > f.expectedDurationSeconds * 1.6) {
    score -= 12;
    reasons.push({ label: "Journey running well over expected time", positive: false });
  }

  if (f.isEscalated) {
    score -= 25;
    reasons.push({ label: "SOS escalation active", positive: false });
  }

  score = Math.round(clamp(score, 4, 98));

  const signalCount = [
    f.routeDeviationMeters > 0,
    f.unexpectedStopSeconds > 0,
    f.nearbySafeZoneCount > 0 || f.nearbyPoliceOrHospital,
    f.communityReportsNearby >= 0,
  ].filter(Boolean).length;
  const confidence = clamp(62 + signalCount * 9, 60, 97);

  return { score, reasons: reasons.slice(0, 6), confidence };
}

export function scoreBand(score: number): { label: string; tone: "safe" | "moderate" | "risky" } {
  if (score >= 75) return { label: "Safe", tone: "safe" };
  if (score >= 50) return { label: "Moderate risk", tone: "moderate" };
  return { label: "High risk", tone: "risky" };
}
