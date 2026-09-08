// Trained AI Safety Score model — a logistic regression trained with
// scikit-learn to classify a journey as "high-risk" vs not.
//
// v2: now trained with a REAL data feature blended in alongside the
// necessarily-simulated per-journey behavior. `historical_crime_index`
// comes from actual NCRB (National Crime Records Bureau) government data
// — district-wise crimes against women, 2001-2012 (public NCRB data
// mirror) — aggregated to state level and min-max normalized to 0-1. See
// /ml/build_real_crime_index.py and /ml/ncrb_real.csv for the exact real
// source data, and /ml/generate_dataset_v2.py for how it's blended with
// simulated per-journey fields (route deviation, unexpected stops, etc.
// — these describe one person's specific trip in real time, which no
// public crime dataset tracks at that granularity, so they stay
// simulated). See /ml/safety_score_training.ipynb for the full training
// notebook, EDA, and evaluation.
//
// Test-set metrics (80/20 split, n=1200 held out):
//   accuracy 0.715 · precision 0.413 · recall 0.705 · f1 0.521
// (class_weight="balanced" — in a safety context, missing a real
// high-risk journey is worse than an extra caution on a safe one, so
// recall is prioritized over precision)
//
// STATE_CRIME_INDEX below is the real NCRB-derived table for all 35
// Indian states/UTs. The app doesn't currently reverse-geocode a
// traveller's coordinates to a state name (that would need an extra
// geocoding API call — a reasonable next enhancement), so
// predictHighRiskProbability() defaults to the DEFAULT_CRIME_INDEX
// (the real dataset's national mean) unless a caller supplies a known
// state name.
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

const SCALER_MEAN = [11.395833, 4.1542, 59.607854, 20.090625, 2.227708, 0.447292, 0.782083, 0.279375, 0.533722];
const SCALER_SCALE = [6.911463, 2.210048, 59.444585, 20.375915, 1.484511, 0.497214, 0.877503, 0.448692, 0.256939];
const COEFFICIENTS = [-0.362146, 0.286763, 0.162859, 0.165346, -0.493449, -0.384396, 0.667586, 0.131773, 0.504559];
const INTERCEPT = -0.316169;

export const ML_MODEL_METRICS = {
  accuracy: 0.715,
  precision: 0.4133,
  recall: 0.7045,
  f1: 0.521,
  trainedOn:
    "6000 simulated journeys blended with a REAL feature (historical_crime_index) derived from actual NCRB government data (district-wise crimes against women, 2001-2012)",
};

// Real NCRB-derived crime index per state/UT (2012, most recent year in
// the source dataset), min-max normalized 0-1 across all states/UTs.
// Source: district-wise crimes against women, National Crime Records
// Bureau — see /ml/ncrb_real.csv and /ml/build_real_crime_index.py.
export const STATE_CRIME_INDEX: Record<string, number> = {
  "WEST BENGAL": 1.0,
  "ANDHRA PRADESH": 0.8228,
  "UTTAR PRADESH": 0.7531,
  RAJASTHAN: 0.6835,
  "MADHYA PRADESH": 0.5466,
  MAHARASHTRA: 0.5215,
  ASSAM: 0.4404,
  KERALA: 0.3503,
  ODISHA: 0.3425,
  BIHAR: 0.3216,
  GUJARAT: 0.3111,
  KARNATAKA: 0.2845,
  "TAMIL NADU": 0.2086,
  HARYANA: 0.1936,
  DELHI: 0.1935,
  CHHATTISGARH: 0.1375,
  JHARKHAND: 0.113,
  "JAMMU & KASHMIR": 0.1086,
  PUNJAB: 0.103,
  TRIPURA: 0.0509,
  UTTARAKHAND: 0.0344,
  "HIMACHAL PRADESH": 0.0296,
  MANIPUR: 0.0094,
  MEGHALAYA: 0.008,
  CHANDIGARH: 0.0078,
  "ARUNACHAL PRADESH": 0.0065,
  MIZORAM: 0.0064,
  GOA: 0.0052,
  SIKKIM: 0.0022,
  "A & N ISLANDS": 0.0015,
  NAGALAND: 0.0015,
  PUDUCHERRY: 0.0014,
  "D & N HAVELI": 0.0004,
  "DAMAN & DIU": 0.0002,
  LAKSHADWEEP: 0.0,
};

// National mean across all states/UTs in the real dataset — the honest
// default when a specific state isn't known for the current journey.
export const DEFAULT_CRIME_INDEX = 0.2172;

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
