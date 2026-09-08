// Trained AI Safety Score model — a logistic regression trained with
// scikit-learn to classify a journey as "high-risk" vs not.
//
// v3: trained on 15,000 simulated journeys (up from 6,000), with
// GridSearchCV 5-fold cross-validated hyperparameter tuning for both
// models (not left on library defaults), and a more robust real-data
// feature: `historical_crime_index` is now a 5-year average (2008-2012,
// the most recent years in the source data) per state rather than a
// single-year snapshot, reducing sensitivity to any one year's reporting
// anomalies.
//
// REAL data: historical_crime_index comes from actual NCRB (National
// Crime Records Bureau) government data — district-wise crimes against
// women, 2001-2012 (public NCRB data mirror, 9,017 real district-year
// rows). See /ml/build_real_crime_index_v3.py and /ml/ncrb_real.csv.
// SIMULATED data: per-journey behavior (route deviation, unexpected
// stops, etc.) — no public dataset tracks one person's specific trip at
// that granularity, so it's generated from realistic domain rules with
// noise. See /ml/generate_dataset_v3.py and
// /ml/safety_score_training_v3.ipynb for the full methodology.
//
// Cross-validated metrics (5-fold, mean +/- std across folds — not just a
// single lucky train/test split):
//   RandomForestRegressor:  CV R^2 0.797 +/- 0.002  (held-out test R^2 0.805, MAE 7.06 points)
//   LogisticRegression:     CV accuracy 0.700 +/- 0.009, CV recall 0.690 +/- 0.017
//                           (held-out test — accuracy 0.706, recall 0.712, f1 0.516)
// Best hyperparameters found via grid search: RF max_depth=10, n_estimators=150;
// LogisticRegression C=0.1, class_weight="balanced" (missing a real
// high-risk journey is worse than an extra caution on a safe one, so
// recall is prioritized over precision).
//
// The app doesn't currently reverse-geocode a traveller's coordinates to
// a state name (a reasonable next enhancement), so
// predictHighRiskProbability() defaults to DEFAULT_CRIME_INDEX (the real
// dataset's national mean) unless a caller supplies a known state name.
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

const FEATURE_ORDER = [
  "hour",
  "distanceKm",
  "routeDeviationMeters",
  "unexpectedStopSeconds",
  "nearbySafeZoneCount",
  "nearbyPoliceOrHospital",
  "communityReportsNearby",
  "isWeekend",
  "historicalCrimeIndex",
] as const;

const SCALER_MEAN = [11.5965, 4.129648, 60.20185, 20.201567, 2.214417, 0.447833, 0.803833, 0.280917, 0.362535];
const SCALER_SCALE = [7.004417, 2.220428, 59.219838, 20.314153, 1.500203, 0.497271, 0.905273, 0.449447, 0.219569];
const COEFFICIENTS = [-0.349804, 0.215202, 0.228481, 0.129614, -0.49445, -0.403339, 0.615007, 0.096828, 0.397895];
const INTERCEPT = -0.274588;

export const ML_MODEL_METRICS = {
  version: "v3",
  trainingSize: 15000,
  accuracy: 0.7063,
  precision: 0.4048,
  recall: 0.7121,
  f1: 0.5162,
  cvAccuracyMean: 0.6996,
  cvAccuracyStd: 0.0087,
  cvRecallMean: 0.6902,
  cvRecallStd: 0.0165,
  rfR2: 0.8049,
  rfCvR2Mean: 0.7967,
  rfMae: 7.059,
  trainedOn:
    "15,000 simulated journeys blended with a REAL feature (historical_crime_index, 5-year average 2008-2012) derived from actual NCRB government data; GridSearchCV 5-fold cross-validated hyperparameter tuning",
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

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function resolveCrimeIndex(stateName?: string): number {
  if (!stateName) return DEFAULT_CRIME_INDEX;
  return STATE_CRIME_INDEX[stateName.toUpperCase().trim()] ?? DEFAULT_CRIME_INDEX;
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
    resolveCrimeIndex(f.stateName),
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
