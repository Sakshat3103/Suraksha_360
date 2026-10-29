# Detector evaluation harness

This is a **simulated-corpus** evaluation — it tests the detection logic
against synthetically generated GPS traces, not real-world field data. It
exists to produce real, reproducible numbers (precision, recall, F1,
detection latency, false alarms/hour) for the thesis review, in place of
the previously-unverified figures in the paper draft.

**Do not present these results as evidence the system works in real
emergencies.** They measure whether the detector correctly flags the
anomalies this generator injected into otherwise-realistic simulated
trajectories — nothing more. Real-world validation requires a field trial
with real phones, real journeys, and consenting participants, which is
explicitly called out as unfinished future work.

## Files

- `trajectory_generator.py` — fetches a real road-network route from the
  public OSRM API, then simulates a 1Hz noisy GPS trace along it with
  injected route-deviation events, injected abnormal-stop events, and
  benign look-alikes (short signal stops, small lane excursions, genuine
  destination stops) — each trajectory's true event labels are stored
  alongside it for scoring.
- `detectors.py` — three detectors, implemented to mirror (not reinvent)
  the TypeScript logic in `src/hooks/use-journey-tracking.ts` and
  `src/lib/geo.ts`:
  1. `naive_single_fix` — flags a deviation/stop the instant a single fix
     crosses threshold. No hysteresis, no accuracy weighting.
  2. `fixed_hysteresis` — requires a sustained breach before confirming
     (same 8s sustain / 0.7 release ratio as the real app), but ignores
     GPS accuracy.
  3. `accuracy_aware_hysteresis` — the real, currently-shipped detector:
     sustained breach + accuracy-widened threshold, ported line-for-line
     from the TypeScript.
- `run_evaluation.py` — generates the corpus, runs all three detectors over
  it, and reports event-level precision/recall/F1, mean & 95th-percentile
  detection latency, and false alarms per hour, as both a console table and
  `results.csv` / `results.json`.

## Running it

```bash
cd evaluation
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 run_evaluation.py --routes 12 --seed 7
```

Requires network access to `router.project-osrm.org` (the same free, public
OSRM demo server the app itself uses for routing — no API key needed).
