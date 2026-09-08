// Trained AI Safety Score model — a logistic regression trained with
// scikit-learn to classify a journey as "high-risk" vs not, using the same
// factors the rule-based risk-engine already tracks (time of day, route
// deviation, nearby safe zones, community reports, etc).
//
// Provenance: trained on a synthetic-but-domain-realistic dataset of 6,000
// simulated journeys (see /ml/generate_dataset.py and the accompanying
// training notebook /ml/safety_score_training.ipynb for the full
// methodology, EDA, and evaluation). This is disclosed honestly as
// synthetic data — a standard way to bootstrap a first model before a real
// labeled incident dataset is available — not presented as real historical
// crime data.
//
// The coefficients below are copied verbatim from that notebook's trained
// LogisticRegression (StandardScaler + class_weight="balanced", chosen to
// favor recall over precision: in a safety context, missing a real
// high-risk journey is worse than an extra caution on a safe one).
//
// Test-set metrics (80/20 split, n=1200 held out):
//   accuracy 0.693 · precision 0.390 · recall 0.705 · f1 0.502
//
// This is a real trained model's exact learned weights, re-implemented
// here as a small formula so it runs instantly client-side with zero
// inference latency and no extra backend dependency — retraining only
// requires re-running the notebook and pasting in new numbers.
export interface MlRiskFeatures {
  hour: number;
  distanceKm: number;
  routeDeviationMeters: number;
  unexpectedStopSeconds: number;
  nearbySafeZoneCount: number;
  nearbyPoliceOrHospital: boolean;
  communityReportsNearby: number;
  isWeekend: boolean;
}

const FEATURE_ORDER = [
  "hour",
  "distanceKm",
  "routeDeviationMeters",
  "unexpectedStopSeconds",
  "nearbySafeZoneCount",
  "nearbyPoliceOrHospital",
  "communityReportsNearby",
  "isWeekend",
] as const;

const SCALER_MEAN = [11.56625, 4.144838, 60.953938, 20.050729, 2.204375, 0.445833, 0.7725, 0.277708];
const SCALER_SCALE = [6.911056, 2.218168, 60.327605, 20.19386, 1.490841, 0.497057, 0.865252, 0.447869];
const COEFFICIENTS = [-0.357447, 0.180321, 0.184938, 0.122375, -0.52687, -0.44008, 0.654573, 0.109433];
const INTERCEPT = -0.250419;

export const ML_MODEL_METRICS = {
  accuracy: 0.6925,
  precision: 0.3899,
  recall: 0.7045,
  f1: 0.502,
  trainedOn: "synthetic dataset (n=6000, 80/20 train-test split)",
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function featureVector(f: MlRiskFeatures): number[] {
  return [
    f.hour,
    f.distanceKm,
    f.routeDeviationMeters,
    f.unexpectedStopSeconds,
    f.nearbySafeZoneCount,
    f.nearbyPoliceOrHospital ? 1 : 0,
    f.communityReportsNearby,
    f.isWeekend ? 1 : 0,
  ];
}

/**
 * Runs the trained logistic regression and returns the model's predicted
 * probability (0-1) that this journey is "high-risk". Pure function, no
 * network call — the trained weights are baked in above.
 */
export function predictHighRiskProbability(f: MlRiskFeatures): number {
  const x = featureVector(f);
  let logit = INTERCEPT;
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    const standardized = (x[i] - SCALER_MEAN[i]) / SCALER_SCALE[i];
    logit += COEFFICIENTS[i] * standardized;
  }
  return sigmoid(logit);
}
