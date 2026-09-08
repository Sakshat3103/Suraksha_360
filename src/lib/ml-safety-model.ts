// Trained AI Safety Score model.
//
// v4: switched from logistic regression to a RandomForestClassifier —
// a non-linear model that captures interactions between factors (e.g.
// "late night AND high crime-index state" mattering more than either
// alone) that a linear model structurally cannot. This raised both
// accuracy AND recall together (not a tradeoff): logistic regression
// scored 71% accuracy / 71% recall; this forest scores 88% accuracy /
// 88% recall, cross-validated (not a lucky single split — see below).
//
// The forest is exported as plain arrays (see /ml/rf-classifier-data.ts)
// — feature index, split threshold, and child pointers per node, plus
// each leaf's learned class-1 probability — and re-implemented here as a
// from-scratch tree-traversal ensemble. This is an EXACT, faithful port
// of the trained scikit-learn model, not an approximation: same 40 trees,
// same splits, same leaf probabilities, just executed in TypeScript
// instead of via joblib.
//
// REAL data: historical_crime_index comes from actual NCRB (National
// Crime Records Bureau) government data — district-wise crimes against
// women, 2001-2012, 5-year average (2008-2012) per state (public NCRB
// data mirror, 9,017 real district-year rows). See
// /ml/build_real_crime_index_v3.py and /ml/ncrb_real.csv.
// SIMULATED data: per-journey behavior (route deviation, unexpected
// stops, etc.) — no public dataset tracks one person's specific trip at
// that granularity. See /ml/generate_dataset_v3.py.
//
// Cross-validated metrics (5-fold, mean +/- std — not a single split):
//   Accuracy: 0.869 +/- 0.008   (held-out test: 0.881)
//   Recall:   0.877 +/- 0.010   (held-out test: 0.885)
//   Precision (held-out test): 0.676   F1 (held-out test): 0.766
// RandomForestClassifier(n_estimators=40, max_depth=5,
// class_weight="balanced"), trained on 15,000 samples. See
// /ml/safety_score_training_v4.ipynb for the full comparison against
// logistic regression and gradient boosting, and why this forest size
// was chosen (near-identical performance to a much larger 200-tree
// forest, at a fraction of the exported size).
//
// The app doesn't currently reverse-geocode a traveller's coordinates to
// a state name (a reasonable next enhancement), so
// predictHighRiskProbability() defaults to DEFAULT_CRIME_INDEX (the real
// dataset's national mean) unless a caller supplies a known state name.
import { RF_TREES, RF_FEATURE_ORDER } from "@/lib/ml-forest-data";

export interface MlRiskFeatures {
  hour: number;
  distanceKm: number;
  routeDeviationMeters: number;
  unexpectedStopSeconds: number;
  nearbySafeZoneCount: number;
  nearbyPoliceOrHospital: boolean;
  communityReportsNearby: number;
  isWeekend: boolean;
  /** Indian state/UT name (e.g. "RAJASTHAN"), if known. Falls back to the national average from real NCRB data when omitted. */
  stateName?: string;
}

export const ML_MODEL_METRICS = {
  version: "v4",
  modelType: "RandomForestClassifier (40 trees, depth 5)",
  trainingSize: 15000,
  accuracy: 0.881,
  precision: 0.676,
  recall: 0.885,
  f1: 0.766,
  cvAccuracyMean: 0.869,
  cvAccuracyStd: 0.008,
  cvRecallMean: 0.877,
  cvRecallStd: 0.01,
  trainedOn:
    "15,000 simulated journeys blended with a REAL feature (historical_crime_index, 5-year average 2008-2012) derived from actual NCRB government data; RandomForestClassifier, 5-fold cross-validated",
};

// Real NCRB-derived crime index per state/UT — 5-year average (2008-2012),
// min-max normalized 0-1 across all states/UTs. Source: district-wise
// crimes against women, National Crime Records Bureau — see
// /ml/ncrb_real.csv and /ml/build_real_crime_index_v3.py.
export const STATE_CRIME_INDEX: Record<string, number> = {
  "WEST BENGAL": 1.0,
  "ANDHRA PRADESH": 0.7522,
  KERALA: 0.4749,
  RAJASTHAN: 0.442,
  ASSAM: 0.3485,
  MAHARASHTRA: 0.3375,
  "UTTAR PRADESH": 0.3015,
  "MADHYA PRADESH": 0.3,
  DELHI: 0.2655,
  GUJARAT: 0.2592,
  TRIPURA: 0.2372,
  HARYANA: 0.2359,
  ODISHA: 0.2208,
  KARNATAKA: 0.2109,
  BIHAR: 0.1835,
  CHHATTISGARH: 0.1749,
  "TAMIL NADU": 0.1505,
  JHARKHAND: 0.1056,
  PUNJAB: 0.1003,
  "JAMMU & KASHMIR": 0.0948,
  CHANDIGARH: 0.0817,
  UTTARAKHAND: 0.078,
  "HIMACHAL PRADESH": 0.0622,
  GOA: 0.0429,
  MEGHALAYA: 0.03,
  PUDUCHERRY: 0.0281,
  "A & N ISLANDS": 0.0213,
  MANIPUR: 0.0201,
  MIZORAM: 0.0181,
  "D & N HAVELI": 0.0098,
  "ARUNACHAL PRADESH": 0.0098,
  SIKKIM: 0.0094,
  NAGALAND: 0.0029,
  "DAMAN & DIU": 0.0019,
  LAKSHADWEEP: 0.0,
};

// National mean across all states/UTs in the real dataset — the honest
// default when a specific state isn't known for the current journey.
export const DEFAULT_CRIME_INDEX = 0.1889;

function resolveCrimeIndex(stateName?: string): number {
  if (!stateName) return DEFAULT_CRIME_INDEX;
  return STATE_CRIME_INDEX[stateName.toUpperCase().trim()] ?? DEFAULT_CRIME_INDEX;
}

function featureVector(f: MlRiskFeatures): number[] {
  const values: Record<(typeof RF_FEATURE_ORDER)[number], number> = {
    hour: f.hour,
    distance_km: f.distanceKm,
    route_deviation_m: f.routeDeviationMeters,
    unexpected_stop_s: f.unexpectedStopSeconds,
    nearby_safe_zone_count: f.nearbySafeZoneCount,
    nearby_police_or_hospital: f.nearbyPoliceOrHospital ? 1 : 0,
    community_reports_nearby: f.communityReportsNearby,
    is_weekend: f.isWeekend ? 1 : 0,
    historical_crime_index: resolveCrimeIndex(f.stateName),
  };
  return RF_FEATURE_ORDER.map((name) => values[name]);
}

// Traverses one decision tree (scikit-learn's flat array format: -1 in
// children_left marks a leaf) and returns that tree's learned
// probability of the "high_risk" class for this input.
function traverseTree(tree: (typeof RF_TREES)[number], x: number[]): number {
  let node = 0;
  while (tree.children_left[node] !== -1) {
    node = x[tree.feature[node]] <= tree.threshold[node] ? tree.children_left[node] : tree.children_right[node];
  }
  return tree.value[node];
}

/**
 * Runs the trained RandomForestClassifier (an exact port of the
 * scikit-learn model — see /ml/safety_score_training_v4.ipynb) and
 * returns its predicted probability (0-1) that this journey is
 * "high-risk", averaged across all 40 trees exactly as scikit-learn's
 * own predict_proba does. Pure function, no network call.
 */
export function predictHighRiskProbability(f: MlRiskFeatures): number {
  const x = featureVector(f);
  const sum = RF_TREES.reduce((acc, tree) => acc + traverseTree(tree, x), 0);
  return sum / RF_TREES.length;
}
