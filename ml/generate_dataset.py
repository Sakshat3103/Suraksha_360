"""
Synthetic training data generator for the Suraksha360 AI Safety Score model.

Honesty note (keep this in the README/notebook): this is SYNTHETIC data,
built from realistic, domain-informed rules with randomness/noise layered
on top -- not scraped from a real incident database. This is a completely
standard and accepted way to bootstrap a first model when no labeled
real-world dataset is available yet, as long as it's disclosed as such.
The features mirror exactly what the existing app's risk-engine.ts already
computes live (hour of day, route deviation, unexpected stop duration,
nearby safe zones, community reports), so the trained model is a drop-in
upgrade path, not a fictional demo disconnected from the real app.
"""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 6000

hour = rng.integers(0, 24, N)
distance_km = rng.uniform(0.3, 8.0, N)
route_deviation_m = rng.exponential(60, N)  # most journeys stay close to plan
route_deviation_m = np.clip(route_deviation_m, 0, 1200)
unexpected_stop_s = rng.exponential(20, N)
unexpected_stop_s = np.clip(unexpected_stop_s, 0, 900)
nearby_safe_zone_count = rng.poisson(2.2, N)
nearby_police_or_hospital = (rng.random(N) < 0.45).astype(int)
community_reports_nearby = rng.poisson(0.8, N)
is_weekend = (rng.random(N) < 0.28).astype(int)

# --- Ground-truth risk generation ---------------------------------------
# A latent "true" risk score built from realistic domain weights, then we
# add noise and threshold it to simulate real-world messiness (two
# journeys with identical features don't always have identical outcomes).
risk = np.zeros(N)

# Time of day is the single strongest real-world factor for personal safety.
night_mask = (hour >= 22) | (hour < 5)
evening_mask = (hour >= 19) & (hour < 22)
risk += np.where(night_mask, 34, np.where(evening_mask, 14, 0))

risk += np.clip(route_deviation_m / 25, 0, 40)
risk += np.clip(unexpected_stop_s / 12, 0, 35)
risk -= np.clip(nearby_safe_zone_count * 4, 0, 20)
risk -= nearby_police_or_hospital * 10
risk += np.clip(community_reports_nearby * 9, 0, 30)
risk += is_weekend * 3  # slightly higher variance/less predictable footfall

# Longer journeys have more exposure time -> marginally higher cumulative risk
risk += np.clip(distance_km * 1.2, 0, 8)

# Real-world noise: two seemingly-identical situations don't always resolve
# the same way. This is what makes it a genuine ML problem rather than
# just re-deriving a deterministic formula.
risk += rng.normal(0, 9, N)
risk = np.clip(risk, 0, 100)

# Binary label for classification framing: "elevated risk" journey (useful
# for a clean accuracy/precision/recall demo) using a realistic ~22% base
# rate rather than a coin-flip 50/50, which is what real safety data looks
# like (most journeys are fine; a meaningful minority are not).
threshold = np.percentile(risk, 78)
high_risk = (risk >= threshold).astype(int)

# Safety score is the inverse (matches the app's "higher = safer" convention)
safety_score = np.clip(100 - risk, 0, 100).round(1)

df = pd.DataFrame({
    "hour": hour,
    "distance_km": distance_km.round(2),
    "route_deviation_m": route_deviation_m.round(1),
    "unexpected_stop_s": unexpected_stop_s.round(1),
    "nearby_safe_zone_count": nearby_safe_zone_count,
    "nearby_police_or_hospital": nearby_police_or_hospital,
    "community_reports_nearby": community_reports_nearby,
    "is_weekend": is_weekend,
    "safety_score": safety_score,
    "high_risk": high_risk,
})

df.to_csv("/tmp/scratch/ml/journeys_synthetic.csv", index=False)
print(df.describe())
print("\nHigh-risk rate:", df["high_risk"].mean())
