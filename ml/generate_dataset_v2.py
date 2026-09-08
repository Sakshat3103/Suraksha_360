"""
Suraksha360 AI Safety Score — training data v2.

Blends REAL data with necessarily-simulated data, and is explicit about
which is which:

REAL: `historical_crime_index` per state, derived from actual NCRB
(National Crime Records Bureau) government data — see
build_real_crime_index.py and ncrb_real.csv (district-wise crimes against
women, 2001-2012, sourced from a public NCRB data mirror).

SIMULATED (necessarily -- no public dataset exists at this granularity):
per-journey behavior like route deviation, unexpected stop duration, and
which specific safe zones are nearby. These describe one person's specific
trip in real time; no crime dataset in the world tracks that.

Each synthetic journey is now assigned to a real Indian state (weighted
by population roughly, for realism) and its `historical_crime_index` comes
from the real NCRB-derived table, not a random number.
"""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 6000

state_index = pd.read_csv("/tmp/scratch/ml/state_crime_index_real.csv")
# Focus on the states/UTs the app is actually likely to be used in demo
# scenarios (major states), weighted roughly by population share so the
# training distribution isn't dominated by tiny UTs.
major_states = [
    "RAJASTHAN", "UTTAR PRADESH", "MAHARASHTRA", "WEST BENGAL", "MADHYA PRADESH",
    "TAMIL NADU", "KARNATAKA", "GUJARAT", "DELHI", "HARYANA", "KERALA", "PUNJAB",
]
weights = [14, 18, 12, 9, 8, 7, 7, 6, 4, 4, 4, 4]
weights = np.array(weights) / sum(weights)

state_choice = rng.choice(major_states, size=N, p=weights)
crime_index_lookup = state_index.set_index("STATE/UT")["historical_crime_index"].to_dict()
historical_crime_index = np.array([crime_index_lookup[s] for s in state_choice])

hour = rng.integers(0, 24, N)
distance_km = rng.uniform(0.3, 8.0, N)
route_deviation_m = np.clip(rng.exponential(60, N), 0, 1200)
unexpected_stop_s = np.clip(rng.exponential(20, N), 0, 900)
nearby_safe_zone_count = rng.poisson(2.2, N)
nearby_police_or_hospital = (rng.random(N) < 0.45).astype(int)
community_reports_nearby = rng.poisson(0.8, N)
is_weekend = (rng.random(N) < 0.28).astype(int)

risk = np.zeros(N)
night_mask = (hour >= 22) | (hour < 5)
evening_mask = (hour >= 19) & (hour < 22)
risk += np.where(night_mask, 34, np.where(evening_mask, 14, 0))
risk += np.clip(route_deviation_m / 25, 0, 40)
risk += np.clip(unexpected_stop_s / 12, 0, 35)
risk -= np.clip(nearby_safe_zone_count * 4, 0, 20)
risk -= nearby_police_or_hospital * 10
risk += np.clip(community_reports_nearby * 9, 0, 30)
risk += is_weekend * 3
risk += np.clip(distance_km * 1.2, 0, 8)

# Real NCRB-derived signal: a state with a historically higher crime index
# raises baseline risk. This is the one part of the risk formula now
# genuinely grounded in real government data rather than an assumption.
risk += historical_crime_index * 22

risk += rng.normal(0, 9, N)
risk = np.clip(risk, 0, 100)

threshold = np.percentile(risk, 78)
high_risk = (risk >= threshold).astype(int)
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
    "state": state_choice,
    "historical_crime_index": historical_crime_index.round(4),
    "safety_score": safety_score,
    "high_risk": high_risk,
})

df.to_csv("/tmp/scratch/ml/journeys_v2_with_real_crime_data.csv", index=False)
print(df.describe())
print("\nHigh-risk rate:", df["high_risk"].mean())
print("\nSample rows:")
print(df.head(8).to_string(index=False))
