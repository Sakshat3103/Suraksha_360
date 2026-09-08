"""
Builds a REAL, state-level historical crime index from actual NCRB
(National Crime Records Bureau) government data — district-wise crimes
against women, 2001-2012 (source: Sidd7893/crime-analysis on GitHub, a
public mirror of the official NCRB open dataset).

This is genuine government data, not synthetic. It's state/district/year
level (no GPS coordinates, no per-journey detail — that granularity simply
doesn't exist in any public crime dataset), so it's used to build one real
feature: a normalized crime-rate index per state, most-recent-year-available,
which becomes an additional real-world input to the training data alongside
the still-necessarily-simulated per-journey behavior (route deviation,
unexpected stops, etc. -- these describe one person's specific trip, which
no dataset tracks).
"""
import pandas as pd

df = pd.read_csv("/tmp/scratch/ml/ncrb_real.csv")
CRIME_COLS = [
    "Rape", "Kidnapping and Abduction", "Dowry Deaths",
    "Assault on women with intent to outrage her modesty",
    "Insult to modesty of Women", "Cruelty by Husband or his Relatives",
    "Importation of Girls",
]
df["total_crimes"] = df[CRIME_COLS].sum(axis=1)

# Use the most recent year available (2012) as the representative snapshot,
# aggregated up to state level (the app doesn't have per-district
# geocoding, so state-level is the granularity we can actually use).
latest = df[df["Year"] == df["Year"].max()]
state_totals = latest.groupby("STATE/UT")["total_crimes"].sum().reset_index()

# Normalize to a 0-1 index (min-max) — this becomes the real-world
# "historical_crime_index" feature, min=safest state, max=highest-crime
# state in this real dataset, for that year.
lo, hi = state_totals["total_crimes"].min(), state_totals["total_crimes"].max()
state_totals["historical_crime_index"] = (state_totals["total_crimes"] - lo) / (hi - lo)

state_totals = state_totals.sort_values("historical_crime_index", ascending=False)
state_totals.to_csv("/tmp/scratch/ml/state_crime_index_real.csv", index=False)

print("Real NCRB-derived state crime index (2012, most recent year in this dataset):")
print(state_totals.to_string(index=False))
