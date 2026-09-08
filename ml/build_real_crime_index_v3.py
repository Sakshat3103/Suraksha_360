"""
v3: real NCRB crime index, averaged across the last 5 available years
(2008-2012) instead of a single year snapshot — more robust and defensible
than picking one year, since a single year can have reporting anomalies.
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

recent = df[df["Year"] >= 2008]
state_avg = recent.groupby("STATE/UT")["total_crimes"].mean().reset_index()
state_avg.columns = ["STATE/UT", "avg_annual_crimes"]

lo, hi = state_avg["avg_annual_crimes"].min(), state_avg["avg_annual_crimes"].max()
state_avg["historical_crime_index"] = (state_avg["avg_annual_crimes"] - lo) / (hi - lo)
state_avg = state_avg.sort_values("historical_crime_index", ascending=False)
state_avg.to_csv("/tmp/scratch/ml/state_crime_index_real_v3.csv", index=False)
print(state_avg.round(4).to_string(index=False))
